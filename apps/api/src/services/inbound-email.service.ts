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
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ since }, { uid: true });
      if (!uids || uids.length === 0) return stats;

      for await (const msg of client.fetch(uids, { source: true }, { uid: true })) {
        stats.checked++;
        try {
          const parsed = await simpleParser(msg.source as Buffer);
          const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase().trim();
          const messageId = parsed.messageId || `imap-uid-${msg.uid}`;
          if (!fromAddr) { stats.skipped++; continue; }
          // Preskoči naše vlastite poslane (kopije u Sent/INBOX)
          if (fromAddr === user.toLowerCase()) { stats.skipped++; continue; }

          // Već zabilježen? (dedup po Message-ID spremljenom u trackingId)
          const exists = await prisma.emailLog.findUnique({ where: { trackingId: messageId } });
          if (exists) { stats.skipped++; continue; }

          // Poveži s članom po emailu pošiljatelja
          const u = await prisma.user.findUnique({ where: { email: fromAddr }, select: { member: { select: { id: true } } } });
          const memberId = u?.member?.id ?? null;
          if (memberId) stats.matched++;

          await prisma.emailLog.create({
            data: {
              trackingId: messageId,
              memberId,
              to: user,
              subject: parsed.subject || '(bez naslova)',
              body: parsed.html || (parsed.text ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(parsed.text)}</pre>` : null),
              status: 'received',
              sentAt: parsed.date || new Date(),
              metadata: { direction: 'inbound', from: fromAddr },
            },
          });
          stats.created++;
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
