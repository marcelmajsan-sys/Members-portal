import { ask } from './claude.js';

export interface MemberContext {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  memberType: string;
  memberTier: string;
  status: string;
  joinedAt: string | null;
  expiresAt: string | null;
  hasCertificate: boolean;
  hasAcademy: boolean;
  safeShopStatus: string | null;
  payments: Array<{ amount: number; description: string; status: string; createdAt: string }>;
  emails: Array<{ subject: string; sentAt: string; openedAt: string | null; clickedAt: string | null }>;
  notes: Array<{ content: string; createdAt: string }>;
  offers: Array<{ status: string; step: number; createdAt: string }>;
}

const SYSTEM_PROMPT = `Ti si AI asistent za eCommerce Hrvatska udrugu. Tvoj zadatak je napisati kratak sažetak o članu udruge na temelju podataka.

Pravila:
- Piši na hrvatskom jeziku
- Budi koncizan: 3-5 rečenica maksimalno
- Naglasi najvažnije: koliko dugo je član, plaća li redovito, otvara li mailove, ističe li uskoro
- Ako ima Safe Shop certifikat, spomeni branding status
- Ako ima Akademiju, spomeni
- Na kraju daj kratku preporuku (npr. "Dobar kandidat za renewal" ili "Rizik od odlaska — ne otvara mailove")
- Ne koristi emoji
- Ne ponavljaj podatke doslovno, sumiraj ih pametno`;

export async function generateMemberSummary(context: MemberContext): Promise<string> {
  const now = new Date();
  const expiresIn = context.expiresAt
    ? Math.ceil((new Date(context.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const emailStats = {
    total: context.emails.length,
    opened: context.emails.filter((e) => e.openedAt).length,
    clicked: context.emails.filter((e) => e.clickedAt).length,
  };

  const offerStats = {
    total: context.offers.length,
    accepted: context.offers.filter((o) => o.status === 'ACCEPTED').length,
    declined: context.offers.filter((o) => o.status === 'DECLINED').length,
    sent: context.offers.filter((o) => o.status === 'SENT').length,
  };

  const tierLabels: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };
  const typeLabels: Record<string, string> = { WEB_TRADER: 'Web trgovac', SERVICE_PROVIDER: 'Nuditelj usluga', PHYSICAL: 'Fizički član' };
  const statusLabels: Record<string, string> = { ACTIVE: 'Aktivan', EXPIRED: 'Istekao', PENDING: 'Na čekanju', SUSPENDED: 'Suspendiran' };

  const userMessage = `Podaci o članu:
- Ime: ${context.firstName} ${context.lastName}
- Firma: ${context.companyName}
- Email: ${context.email}
- Tip: ${typeLabels[context.memberType] || context.memberType}
- Razina: ${tierLabels[context.memberTier] || context.memberTier}
- Status: ${statusLabels[context.status] || context.status}
- Učlanjen: ${context.joinedAt || 'nepoznato'}
- Ističe: ${context.expiresAt || 'nema'} (${expiresIn !== null ? (expiresIn > 0 ? `za ${expiresIn} dana` : `isteklo prije ${Math.abs(expiresIn)} dana`) : 'nema datuma'})
- Safe Shop certifikat: ${context.hasCertificate ? 'Da' : 'Ne'}
- Safe Shop branding: ${context.safeShopStatus || 'nema'}
- Akademija: ${context.hasAcademy ? 'Završena' : 'Ne'}
- Ukupno plaćanja: ${context.payments.length} (zadnje: ${context.payments[0]?.description || 'nema'})
- Emailovi: ${emailStats.total} poslano, ${emailStats.opened} otvoreno, ${emailStats.clicked} kliknuto
- Ponude: ${offerStats.total} ukupno, ${offerStats.accepted} prihvaćeno, ${offerStats.declined} odbijeno, ${offerStats.sent} poslano
- Bilješke: ${context.notes.length > 0 ? context.notes.map((n) => `"${n.content}"`).join('; ') : 'nema'}

Napiši sažetak:`;

  return ask(SYSTEM_PROMPT, userMessage, { maxTokens: 500, temperature: 0.3 });
}
