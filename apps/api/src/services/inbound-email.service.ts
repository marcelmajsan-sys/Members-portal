import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@ecommerce-hr/db';
import { logger } from '../utils/logger.js';

export interface InboundStats {
  checked: number;
  created: number;
  matched: number;
  skipped: number;
  errors: number;
}

/**
 * Spaja se na sandučić udruge (Gmail IMAP, samo čita), povlači dolazne mailove
 * od zadnjeg zabilježenog odgovora, povezuje ih s članom po emailu pošiljatelja
 * i bilježi kao EmailLog (status "received"). Idempotentno — dedup po Message-ID.
 */
export async function fetchInboundEmails(): Promise<InboundStats> {
  const host = process.env.IMAP_HOST || 'imap.gmail.com';
  const user = (process.env.IMAP_USER || '').trim();
  const pass = process.env.IMAP_PASSWORD || '';
  if (!user || !pass) throw new Error('IMAP_USER / IMAP_PASSWORD nisu postavljeni');

  const stats: InboundStats = { checked: 0, created: 0, matched: 0, skipped: 0, errors: 0 };

  // Od kad povlačiti: dan prije zadnjeg primljenog maila; prvi put zadnjih 30 dana.
  const last = await prisma.emailLog.findFirst({
    where: { status: 'received' },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true },
  });
  const since = last
    ? new Date(last.sentAt.getTime() - 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Učitaj emailove svih članova jednom (za brzo povezivanje, bez upita po poruci).
  const memberUsers = await prisma.user.findMany({
    where: { member: { isNot: null } },
    select: { email: true, member: { select: { id: true } } },
  });
  const emailToMember = new Map<string, string>();
  for (const u of memberUsers) if (u.member) emailToMember.set(u.email.toLowerCase().trim(), u.member.id);

  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ since }, { uid: true });
      if (!uids || uids.length === 0) return stats;

      // 1) Brzo: samo zaglavlja (envelope) — bez skidanja tijela.
      type Hit = { uid: number; memberId: string; from: string; messageId: string; subject: string; date: Date };
      const hits: Hit[] = [];
      for await (const msg of client.fetch(uids, { envelope: true }, { uid: true })) {
        stats.checked++;
        const env = msg.envelope;
        const fromAddr = env?.from?.[0]?.address?.toLowerCase().trim();
        const messageId = env?.messageId || `imap-uid-${msg.uid}`;
        if (!fromAddr || fromAddr === user.toLowerCase()) { stats.skipped++; continue; }
        const memberId = emailToMember.get(fromAddr); // SAMO odgovori članova
        if (!memberId) { stats.skipped++; continue; }
        hits.push({ uid: msg.uid, memberId, from: fromAddr, messageId, subject: env?.subject || '(bez naslova)', date: env?.date || new Date() });
      }

      // 2) Samo za mailove od članova: provjeri dedup i skini tijelo.
      for (const h of hits) {
        try {
          const exists = await prisma.emailLog.findUnique({ where: { trackingId: h.messageId } });
          if (exists) { stats.skipped++; continue; }

          let body: string | null = null;
          try {
            const full = await client.fetchOne(String(h.uid), { source: true }, { uid: true });
            if (full && full.source) {
              const parsed = await simpleParser(full.source as Buffer);
              body = parsed.html || (parsed.text ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(parsed.text)}</pre>` : null);
            }
          } catch { /* tijelo nije obavezno */ }

          await prisma.emailLog.create({
            data: {
              trackingId: h.messageId,
              memberId: h.memberId,
              to: user,
              subject: h.subject,
              body,
              status: 'received',
              sentAt: h.date,
              metadata: { direction: 'inbound', from: h.from },
            },
          });
          stats.created++;
          stats.matched++;
        } catch (err) {
          stats.errors++;
          if (stats.errors <= 5) logger.warn({ err }, 'Inbound: greška pri obradi poruke');
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  logger.info({ stats }, 'Inbound fetch gotov');
  return stats;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
