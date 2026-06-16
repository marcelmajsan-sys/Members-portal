interface EmailMember {
  user: { firstName: string; lastName?: string };
  company?: { name: string };
}

const LOGO_URL = 'https://members.ecommerce.hr/admin/logo.png';

const HEADER = `<div style="background:#1B365D;padding:20px 24px;text-align:center;">
  <img src="${LOGO_URL}" alt="eCommerce Hrvatska" style="height:44px;display:inline-block;" />
</div>`;

const FOOTER = `<div style="background:#1B365D;padding:20px 24px;text-align:center;">
  <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
  <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
</div>`;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function buildRenewalConfirmationEmail(
  member: EmailMember,
  amount: number,
  newExpiresAt: Date,
  benefits: string[],
): { subject: string; html: string } {
  const formattedDate = newExpiresAt.toLocaleDateString('hr-HR');
  return {
    subject: 'Potvrda produženja članstva — eCommerce Hrvatska',
    html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  ${HEADER}
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    <p>Vaše članstvo u udruzi eCommerce Hrvatska uspješno je produženo.</p>
    <div style="background:#F0F9FF;border-left:4px solid #1B365D;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:bold;color:#1B365D;">Detalji produženja:</p>
      <p style="margin:4px 0;">Iznos: <strong>${formatCurrency(amount)}</strong></p>
      <p style="margin:4px 0;">Aktivno do: <strong>${formattedDate}</strong></p>
    </div>
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a>.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  ${FOOTER}
</body></html>`,
  };
}

export function buildWelcomeEmail(
  member: EmailMember,
): { subject: string; html: string } {
  return {
    subject: 'Dobrodošli u eCommerce Hrvatska!',
    html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  ${HEADER}
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    <p>Dobrodošli u udrugu <strong>eCommerce Hrvatska</strong>! Vaše članstvo je uspješno aktivirano.</p>
    <div style="background:#F0FDF4;border-left:4px solid #16A34A;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;color:#166534;">Članstvo je aktivno</p>
      <p style="margin:4px 0 0;font-size:13px;color:#166534;">Sada imate pristup svim pogodnostima vaše razine članstva.</p>
    </div>
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  ${FOOTER}
</body></html>`,
  };
}

export function buildExpiredEmail(
  member: EmailMember,
  expiresFormatted: string,
): { subject: string; html: string } {
  return {
    subject: 'Vaše članstvo je isteklo — eCommerce Hrvatska',
    html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  ${HEADER}
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    <p>Obavještavamo Vas da je Vaše članstvo u udruzi eCommerce Hrvatska <strong style="color:#DC2626;">isteklo${expiresFormatted ? ` (${expiresFormatted})` : ''}</strong>.</p>
    <div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;color:#991B1B;">Članstvo je isteklo</p>
      <p style="margin:4px 0 0;font-size:13px;color:#991B1B;">Obnovite članstvo kako biste zadržali pristup svim pogodnostima.</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://ecommerce.hr/clanstvo" style="background:#E8A838;color:#1B365D;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Obnovite članstvo</a>
    </div>
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  ${FOOTER}
</body></html>`,
  };
}

export function buildEventInvitationEmail(
  member: EmailMember,
  eventTitle: string,
  eventDate: string,
  eventLocation?: string,
): { subject: string; html: string } {
  const formattedDate = new Date(eventDate).toLocaleDateString('hr-HR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const locationHtml = eventLocation
    ? `<p style="margin:4px 0;">Lokacija: <strong>${eventLocation}</strong></p>`
    : '';

  return {
    subject: `Pozivnica: ${eventTitle} — eCommerce Hrvatska`,
    html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  ${HEADER}
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    <p>Pozivamo Vas na događaj koji organizira udruga <strong>eCommerce Hrvatska</strong>:</p>
    <div style="background:#F0F9FF;border-left:4px solid #1B365D;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:bold;color:#1B365D;font-size:16px;">${eventTitle}</p>
      <p style="margin:4px 0;">Datum: <strong>${formattedDate}</strong></p>
      ${locationHtml}
    </div>
    <p>Veselimo se Vašem dolasku!</p>
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  ${FOOTER}
</body></html>`,
  };
}

export function buildFreeUpgradeEmail(
  member: EmailMember,
  standardPrice: number,
  _standardBenefits: string[],
  premiumPrice?: number | null,
  _premiumBenefits?: string[],
  memberId?: string,
): { subject: string; html: string } {
  const base = process.env.API_BASE_URL || 'https://sceweq2cxc.execute-api.eu-central-1.amazonaws.com';
  const upgradeUrl = memberId ? `${base}/api/public/upgrade-response?memberId=${memberId}` : 'https://ecommerce.hr/clanstvo';

  const premiumSection = premiumPrice
    ? `<div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-weight:bold;color:#7C3AED;">Premium — ${formatCurrency(premiumPrice)}/god</p>
      </div>`
    : '';

  return {
    subject: 'Nadogradite članstvo — eCommerce Hrvatska',
    html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  ${HEADER}
  <div style="padding:24px;">
    <p>Poštovani <strong>${member.user.firstName}</strong>,</p>
    <p>Trenutno koristite besplatno članstvo u udruzi eCommerce Hrvatska. Nadogradnjom na plaćenu razinu dobivate pristup svim pogodnostima:</p>
    <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;color:#1B365D;">Standard — ${formatCurrency(standardPrice)}/god</p>
    </div>
    ${premiumSection}
    <p style="font-size:16px;font-weight:bold;margin:24px 0 16px;">Želite li nadograditi članstvo?</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${upgradeUrl}" style="background:#16A34A;color:#fff;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:16px;">Da, želim nadograditi</a>
    </div>
    <p>Za sva pitanja kontaktirajte nas na <a href="mailto:udruga@ecommerce.hr" style="color:#E8A838;">udruga@ecommerce.hr</a> ili +385 99 2025707.</p>
    <p>Srdačan pozdrav,<br/><strong>Tim eCommerce Hrvatska</strong></p>
  </div>
  ${FOOTER}
</body></html>`,
  };
}
