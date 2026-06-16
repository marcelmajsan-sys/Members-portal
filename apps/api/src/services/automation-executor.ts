import { prisma } from '@ecommerce-hr/db';
import type { MemberType, MemberTier } from '@ecommerce-hr/db';
import { sendEmail } from '@ecommerce-hr/email';
import { logger } from '../utils/logger.js';
import {
  buildFreeUpgradeEmail,
  buildWelcomeEmail,
  buildExpiredEmail,
  buildEventInvitationEmail,
} from '../utils/member-emails.js';
import { getMembershipPrice, getMembershipBenefits, isTierAvailable } from '../config/membership.js';
import { resolveTemplate } from '../utils/resolve-template.js';

const COOLDOWN_DAYS = 7;

// Group similar templates — cooldown only applies within the same group
const COOLDOWN_GROUPS: Record<string, string[]> = {
  reminder: ['renewal_reminder', 'renewal_urgent', 'renewal_final', 'offer_step_1', 'offer_step_2'],
  upgrade: ['free_upgrade'],
  welcome: ['welcome'],
  expired: ['expired'],
  event_invitation: ['event_invitation'],
};

interface StepConfig {
  type: string;
  config: Record<string, unknown>;
  order: number;
}

/**
 * Execute all ACTIVE sequences matching the given trigger event.
 * Runs inline in the Lambda — no Redis, no worker.
 */
export async function executeAutomationEvent(
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const sequences = await prisma.sequence.findMany({
      where: { triggerEvent: event, status: 'ACTIVE' },
    });

    if (sequences.length === 0) return;

    logger.info({ event, sequenceCount: sequences.length }, 'Executing automation sequences');

    for (const sequence of sequences) {
      try {
        const steps = (sequence.steps as unknown as StepConfig[]).sort((a, b) => a.order - b.order);
        let aborted = false;

        for (const step of steps) {
          if (aborted) break;

          const stepType = step.type.toLowerCase();

          if (stepType === 'send_email' || stepType === 'email') {
            await resolveAndSendEmail(
              step.config.template as string,
              step.config.subject as string,
              payload,
            );
          } else if (stepType === 'condition') {
            const { field, operator, value } = step.config as {
              field: string;
              operator: string;
              value: unknown;
            };
            const actual = payload[field];
            if (!evaluateCondition(actual, operator, value)) {
              aborted = true;
            }
          } else if (stepType === 'notification') {
            const userId = payload.userId as string | undefined;
            if (userId) {
              await prisma.notification.create({
                data: {
                  userId,
                  type: 'INFO',
                  title: (step.config.title as string) || event,
                  message: (step.config.message as string) || `Automatska obavijest: ${event}`,
                },
              });
            }
          } else if (stepType === 'task') {
            await prisma.task.create({
              data: {
                title: (step.config.title as string) || `Zadatak: ${event}`,
                description: (step.config.description as string) || undefined,
                assignedToId: (step.config.assignedToId as string) || undefined,
                createdById: (payload.userId as string) || undefined,
              },
            });
          } else if (stepType === 'wait') {
            logger.warn({ event, sequenceId: sequence.id }, 'WAIT step skipped — not supported in Lambda');
          }
        }

        // Log success
        await prisma.automationLog.create({
          data: {
            sequenceId: sequence.id,
            event,
            payload: payload as object,
            result: { stepsExecuted: steps.length, aborted },
            success: true,
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ event, sequenceId: sequence.id, error: errorMsg }, 'Sequence execution failed');

        await prisma.automationLog.create({
          data: {
            sequenceId: sequence.id,
            event,
            payload: payload as object,
            success: false,
            error: errorMsg,
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    logger.error({ event, error: err instanceof Error ? err.message : String(err) }, 'executeAutomationEvent failed');
  }
}

function evaluateCondition(actual: unknown, operator: string, expected: unknown): boolean {
  const numActual = Number(actual);
  const numExpected = Number(expected);

  switch (operator) {
    case 'eq':
    case '==':
      return actual === expected || (numActual === numExpected && !isNaN(numActual));
    case 'neq':
    case '!=':
      return actual !== expected;
    case 'gt':
    case '>':
      return numActual > numExpected;
    case 'gte':
    case '>=':
      return numActual >= numExpected;
    case 'lt':
    case '<':
      return numActual < numExpected;
    case 'lte':
    case '<=':
      return numActual <= numExpected;
    default:
      logger.warn({ operator }, 'Unknown condition operator — treating as false');
      return false;
  }
}

/**
 * Check if a similar email was sent to this member within the cooldown period.
 * Returns the last email date if within cooldown, null if OK to send.
 */
export async function checkEmailCooldown(
  memberId: string,
  template: string,
  cooldownDays = COOLDOWN_DAYS,
): Promise<Date | null> {
  const cooldownDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

  // Find which group this template belongs to — only check within that group
  const group = Object.values(COOLDOWN_GROUPS).find((g) => g.includes(template));
  const templatesToCheck = group || [template];

  const lastEmail = await prisma.emailLog.findFirst({
    where: {
      memberId,
      templateName: { in: templatesToCheck },
      sentAt: { gte: cooldownDate },
    },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true },
  });

  return lastEmail?.sentAt ?? null;
}

async function resolveAndSendEmail(
  template: string,
  subject: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const memberId = payload.memberId as string | undefined;
  if (!memberId) {
    logger.warn({ template }, 'No memberId in payload — cannot send email');
    return;
  }

  // Cooldown check — skip if a similar email was sent recently
  const lastSent = await checkEmailCooldown(memberId, template);
  if (lastSent) {
    logger.info({ memberId, template, lastSent }, 'Skipping email — cooldown active');
    return;
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      company: { select: { name: true } },
    },
  });

  if (!member) {
    logger.warn({ memberId }, 'Member not found — skipping email');
    return;
  }

  const emailMember = {
    user: { firstName: member.user.firstName, lastName: member.user.lastName || undefined },
    company: member.company ? { name: member.company.name } : undefined,
  };
  const memberType = member.memberType as MemberType;
  const memberTier = member.memberTier as MemberTier;
  const to = member.user.email;

  let html: string;
  let finalSubject: string;

  // Try DB-first resolution — if Marcel edited the template, use his version
  const dbTpl = await resolveTemplate(template);
  if (dbTpl) {
    const bodyParagraphs = dbTpl.body.split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('\n    ');
    const ctaHtml = dbTpl.ctaLabel && dbTpl.ctaUrl
      ? `<div style="text-align:center;margin:32px 0;">
          <a href="${dbTpl.ctaUrl}" style="background:#E8A838;color:#1B365D;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">${dbTpl.ctaLabel}</a>
        </div>`
      : '';
    html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    ${bodyParagraphs}
    ${ctaHtml}
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`;
    finalSubject = subject || dbTpl.subject;
    await sendEmail(to, finalSubject, html, { memberId, templateName: template });
    return;
  }

  switch (template) {
    case 'renewal_reminder':
    case 'renewal_urgent':
    case 'renewal_final': {
      logger.info({ template }, 'Skipping renewal reminder — handled manually via send-offer with PDF');
      return;
    }

    case 'welcome': {
      const email = buildWelcomeEmail(emailMember);
      html = email.html;
      finalSubject = subject || email.subject;
      break;
    }

    case 'expired': {
      const expiresFormatted = member.expiresAt
        ? new Date(member.expiresAt).toLocaleDateString('hr-HR')
        : '';
      const email = buildExpiredEmail(emailMember, expiresFormatted);
      html = email.html;
      finalSubject = subject || email.subject;
      break;
    }

    case 'free_upgrade': {
      const standardPrice = getMembershipPrice(memberType, 'STANDARD') ?? 0;
      const standardBenefits = getMembershipBenefits(memberType, 'STANDARD');
      const premPrice = getMembershipPrice(memberType, 'PREMIUM');
      const premBenefits = isTierAvailable(memberType, 'PREMIUM')
        ? getMembershipBenefits(memberType, 'PREMIUM')
        : undefined;
      const email = buildFreeUpgradeEmail(emailMember, standardPrice, standardBenefits, premPrice, premBenefits, memberId);
      html = email.html;
      finalSubject = subject || email.subject;
      break;
    }

    case 'event_invitation': {
      const email = buildEventInvitationEmail(
        emailMember,
        (payload.eventTitle as string) || 'Događaj',
        (payload.eventDate as string) || new Date().toISOString(),
        (payload.eventLocation as string) || undefined,
      );
      html = email.html;
      finalSubject = subject || email.subject;
      break;
    }

    case 'custom': {
      // Generic HTML — same pattern as /notify endpoint
      html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:44px;" />
  </div>
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    <p>${subject}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://ecommerce-hr-os.vercel.app/dashboard" style="background:#E8A838;color:#1B365D;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Otvori Dashboard</a>
    </div>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>
</body></html>`;
      finalSubject = subject || 'Obavijest — eCommerce Hrvatska';
      break;
    }

    default: {
      if (template.startsWith('offer_step_')) {
        logger.info({ template }, 'Skipping offer email — handled by send-offer with PDF');
        return;
      }
      logger.warn({ template }, 'Unknown email template — skipping');
      return;
    }
  }

  await sendEmail(to, finalSubject, html, { memberId, templateName: template });
}
