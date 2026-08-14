import { prisma, type Prisma } from '@ecommerce-hr/db';
import type { CreateSequenceInput, UpdateSequenceInput } from '@ecommerce-hr/shared';
import { daysUntilExpiry } from './renewal.service.js';
import { DEFAULT_TEMPLATES } from '../utils/resolve-template.js';

export async function getSequences(page: number, limit: number) {
  const skip = (page - 1) * limit;

  // CANCELLED = "obrisane" automatizacije — ne vraćaju se u listu (UI ih briše preko statusa)
  const where = { status: { not: 'CANCELLED' as const } };
  const [sequences, total] = await Promise.all([
    prisma.sequence.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { logs: true } },
      },
    }),
    prisma.sequence.count({ where }),
  ]);

  return { sequences, total };
}

export async function getSequenceById(id: string) {
  return prisma.sequence.findUnique({
    where: { id },
    include: {
      _count: { select: { logs: true } },
    },
  });
}

export async function createSequence(data: CreateSequenceInput) {
  return prisma.sequence.create({
    data: {
      name: data.name,
      description: data.description,
      triggerEvent: data.triggerEvent,
      steps: data.steps as Prisma.InputJsonValue,
      status: data.status ?? 'ACTIVE',
    },
  });
}

export async function updateSequence(id: string, data: UpdateSequenceInput) {
  const updateData: Prisma.SequenceUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.triggerEvent !== undefined) updateData.triggerEvent = data.triggerEvent;
  if (data.steps !== undefined) updateData.steps = data.steps as Prisma.InputJsonValue;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.sequence.update({
    where: { id },
    data: updateData,
  });
}

export async function updateSequenceStatus(id: string, status: string) {
  return prisma.sequence.update({
    where: { id },
    data: { status: status as 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' },
  });
}

export async function getSequenceLogs(sequenceId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.automationLog.findMany({
      where: { sequenceId },
      skip,
      take: limit,
      orderBy: { executedAt: 'desc' },
    }),
    prisma.automationLog.count({ where: { sequenceId } }),
  ]);

  return { logs, total };
}

// ---------------------------------------------------------------------------
// Analitika automatizacija (read-only) — /admin/automation → tab "Analitika"
// ---------------------------------------------------------------------------
// AutomationLog je (zasad) prazan pa se povijest gradi iz EmailLog (po templateName),
// a "tko je u automatizaciji" računa se UŽIVO iz Member + daysUntilExpiry() —
// ista logika kao dnevni cron (renewal.service).

const DAY_MS = 24 * 60 * 60 * 1000;
// Koliko unaprijed gledamo audience za podsjetnike (dana od okidanja).
const REMINDER_HORIZON_DAYS = 60;
// Maksimalno redaka po listi (audience / povijest) — count je uvijek pun.
const ANALYTICS_LIST_LIMIT = 50;

// Predlošci koje automatizacije koriste (za KPI "poslano" i povijest slanja).
const AUTOMATION_TEMPLATE_SLUGS = [
  'welcome', 'expired',
  'renewal_reminder', 'renewal_urgent', 'renewal_final', 'renewal_expiry_today',
];
// Predlošci koji u privitku nose predračun (PDF) — isto kao OFFER_ATTACHMENT_TEMPLATES u executoru.
const ATTACHMENT_TEMPLATE_SLUGS = [
  'renewal_reminder', 'renewal_urgent', 'renewal_final', 'renewal_expiry_today', 'expired',
];

interface StepConfigLite {
  type: string;
  order: number;
  config: Record<string, unknown>;
}

interface AnalyticsMember {
  memberId: string;
  name: string;
  company: string | null;
  email: string;
  date: string | null;     // ISO datum (okidanje / istek / učlanjenje)
  dateKind: 'okida' | 'isteklo' | 'uclanjen';
  state: 'scheduled' | 'expired' | 'active';
}

interface AnalyticsSend {
  memberId: string | null;
  name: string;
  company: string | null;
  email: string;
  sentAt: string | null;
  status: string;
}

const isoDate = (d: Date | null | undefined): string | null =>
  d ? new Date(d).toISOString().slice(0, 10) : null;

const memberName = (m: {
  user: { firstName: string; lastName: string | null; email: string };
  company: { name: string } | null;
}): string =>
  `${m.user.firstName} ${m.user.lastName ?? ''}`.trim() || m.company?.name || m.user.email;

export async function getSequenceAnalytics() {
  const now = new Date();

  const memberInclude = {
    user: { select: { firstName: true, lastName: true, email: true } },
    company: { select: { name: true } },
  } as const;

  const [
    sequences,
    activeMembers,
    expiredMembers,
    expiredCount,
    pendingCount,
    autoSends,
    autoSentTotal,
    dbTemplates,
  ] = await Promise.all([
    prisma.sequence.findMany({
      where: { status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    }),
    prisma.member.findMany({ where: { isLead: false, status: 'ACTIVE' }, include: memberInclude }),
    prisma.member.findMany({
      where: { isLead: false, status: 'EXPIRED' },
      include: memberInclude,
      orderBy: { expiresAt: 'desc' },
      take: ANALYTICS_LIST_LIMIT,
    }),
    prisma.member.count({ where: { isLead: false, status: 'EXPIRED' } }),
    prisma.member.count({ where: { isLead: false, status: 'PENDING' } }),
    prisma.emailLog.findMany({
      where: { templateName: { in: AUTOMATION_TEMPLATE_SLUGS } },
      orderBy: { sentAt: 'desc' },
      include: { member: { include: memberInclude } },
    }),
    prisma.emailLog.count({ where: { templateName: { in: AUTOMATION_TEMPLATE_SLUGS } } }),
    prisma.emailTemplate.findMany(),
  ]);

  const templateBySlug = new Map(dbTemplates.map((t) => [t.slug, t]));

  // Povijest slanja grupirana po predlošku.
  const sendsByTemplate = new Map<string, AnalyticsSend[]>();
  for (const log of autoSends) {
    const slug = log.templateName!;
    const list = sendsByTemplate.get(slug) ?? [];
    list.push({
      memberId: log.memberId,
      name: log.member ? memberName(log.member) : log.to,
      company: log.member?.company?.name ?? null,
      email: log.to,
      sentAt: log.sentAt ? new Date(log.sentAt).toISOString() : null,
      status: log.status,
    });
    sendsByTemplate.set(slug, list);
  }

  // Aktivni članovi kojima ističe članstvo unutar 60 dana (za KPI + audience podsjetnika).
  const activeWithDays = activeMembers
    .filter((m) => m.expiresAt)
    .map((m) => ({ m, d: daysUntilExpiry(m.expiresAt!, now) }));
  const expiringSoon = activeWithDays.filter((x) => x.d >= 0 && x.d <= REMINDER_HORIZON_DAYS).length;

  const automations = sequences.map((seq) => {
    const steps = ((seq.steps as unknown as StepConfigLite[]) ?? []).slice().sort((a, b) => a.order - b.order);
    const emailStep = steps.find((s) => ['send_email', 'email'].includes(s.type.toLowerCase()));
    const condStep = steps.find((s) => s.type.toLowerCase() === 'condition');
    const templateSlug = (emailStep?.config?.template as string) ?? null;
    const conditionDay = condStep ? Number(condStep.config?.value) : null;

    const dbTpl = templateSlug ? templateBySlug.get(templateSlug) : undefined;
    const defTpl = templateSlug ? DEFAULT_TEMPLATES.find((t) => t.slug === templateSlug) : undefined;
    const template = templateSlug
      ? {
          slug: templateSlug,
          name: dbTpl?.name ?? defTpl?.name ?? templateSlug,
          subject: (emailStep?.config?.subject as string) || dbTpl?.subject || defTpl?.subject || '',
          body: dbTpl?.body ?? defTpl?.body ?? '',
          inDb: !!dbTpl,
          isHidden: dbTpl?.isHidden ?? false,
        }
      : null;

    let audience: AnalyticsMember[] = [];
    let audienceCount = 0;

    if (seq.triggerEvent === 'member.expiry_reminder' && conditionDay !== null && !Number.isNaN(conditionDay)) {
      // Podsjetnik na dan D: član ga dobiva kad daysUntilExpiry padne na D → okida = expiresAt - D dana.
      // Prikazujemo one koji tu točku tek trebaju dosegnuti (d >= D) unutar horizonta.
      const matched = activeWithDays
        .filter((x) => x.d >= conditionDay && x.d <= conditionDay + REMINDER_HORIZON_DAYS)
        .map((x) => ({
          m: x.m,
          fire: new Date(x.m.expiresAt!.getTime() - conditionDay * DAY_MS),
        }))
        .sort((a, b) => a.fire.getTime() - b.fire.getTime());
      audienceCount = matched.length;
      audience = matched.slice(0, ANALYTICS_LIST_LIMIT).map(({ m, fire }) => ({
        memberId: m.id,
        name: memberName(m),
        company: m.company?.name ?? null,
        email: m.user.email,
        date: isoDate(fire),
        dateKind: 'okida' as const,
        state: 'scheduled' as const,
      }));
    } else if (seq.triggerEvent === 'member.expired') {
      audienceCount = expiredCount;
      audience = expiredMembers.map((m) => ({
        memberId: m.id,
        name: memberName(m),
        company: m.company?.name ?? null,
        email: m.user.email,
        date: isoDate(m.expiresAt),
        dateKind: 'isteklo' as const,
        state: 'expired' as const,
      }));
    } else if (seq.triggerEvent === 'member.activated') {
      // Dobrodošlica ide pri aktivaciji — audience su aktivni članovi (prikaz: najnoviji).
      audienceCount = activeMembers.length;
      audience = [...activeMembers]
        .sort((a, b) => (b.joinedAt?.getTime() ?? 0) - (a.joinedAt?.getTime() ?? 0))
        .slice(0, ANALYTICS_LIST_LIMIT)
        .map((m) => ({
          memberId: m.id,
          name: memberName(m),
          company: m.company?.name ?? null,
          email: m.user.email,
          date: isoDate(m.joinedAt),
          dateKind: 'uclanjen' as const,
          state: 'active' as const,
        }));
    }

    const sends = templateSlug ? sendsByTemplate.get(templateSlug) ?? [] : [];

    return {
      id: seq.id,
      name: seq.name,
      description: seq.description,
      triggerEvent: seq.triggerEvent,
      status: seq.status,
      stepCount: steps.length,
      conditionDay,
      templateSlug,
      hasAttachment: templateSlug ? ATTACHMENT_TEMPLATE_SLUGS.includes(templateSlug) : false,
      template,
      audienceCount,
      audience,
      audienceMore: Math.max(0, audienceCount - audience.length),
      sendCount: sends.length,
      sends: sends.slice(0, ANALYTICS_LIST_LIMIT),
    };
  });

  return {
    today: isoDate(now),
    kpis: {
      activeSequences: sequences.filter((s) => s.status === 'ACTIVE').length,
      activeMembers: activeMembers.length,
      expiringSoon,
      expiredMembers: expiredCount,
      pendingMembers: pendingCount,
      autoEmailsSent: autoSentTotal,
    },
    automations,
  };
}
