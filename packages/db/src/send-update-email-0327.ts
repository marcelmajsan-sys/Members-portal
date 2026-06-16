import { sendEmail } from '../../email/src/send.js';

async function main() {
  const html = `<!DOCTYPE html>
<html lang="hr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#333;">

  <!-- Header -->
  <div style="background:#1B365D;padding:28px 24px;text-align:center;">
    <img src="https://members.ecommerce.hr/admin/logo.png" alt="eCommerce Hrvatska" style="height:48px;" />
  </div>

  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">

    <!-- Title -->
    <div style="background:#fff;border-radius:12px;padding:32px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="color:#1B365D;margin:0 0 8px;font-size:24px;">Ažuriranje sustava</h1>
      <p style="color:#64748B;margin:0;font-size:14px;">27. ožujka 2026. — Nove funkcionalnosti po zahtjevu</p>
    </div>

    <!-- Section 1: Edit Member -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#D1FAE5;color:#065F46;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">1. Uređivanje podataka člana</div>
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
        Na profilu svakog člana sada postoji gumb <strong>"Uredi podatke"</strong> koji otvara modal za uređivanje svih podataka.
      </p>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li><strong>Osobni podaci</strong> — ime, prezime, email, telefon</li>
        <li><strong>Podaci o firmi</strong> — naziv, OIB, adresa, grad, web stranica</li>
        <li><strong>Tip članstva</strong> — Web trgovac, Nuditelj usluga, Fizički član</li>
      </ul>
      <p style="font-size:13px;color:#64748B;margin:12px 0 0;line-height:1.5;">
        Gumb se nalazi gore desno na profilu člana, pored badgeova razine i statusa.
      </p>
    </div>

    <!-- Section 2: Multi-select Filters -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#DBEAFE;color:#1D4ED8;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">2. Multi-select filteri na listi članova</div>
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
        Filter pillovi na stranici članova sada podržavaju <strong>višestruki odabir</strong>.
      </p>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li>Kliknite više filtera odjednom (npr. <strong>Aktivni + Certifikat</strong>)</li>
        <li>Odabrani filteri su plavo označeni, klik ponovno ih deaktivira</li>
        <li><strong>"Sve"</strong> poništava sve filtere i prikazuje sve članove</li>
        <li>Filteri iste kategorije se kombiniraju (npr. Aktivni + Istekli = svi koji su aktivni ILI istekli)</li>
      </ul>
    </div>

    <!-- Summary -->
    <div style="background:linear-gradient(135deg,#1B365D,#2A4A7A);border-radius:12px;padding:24px;margin-bottom:16px;color:#fff;">
      <h3 style="margin:0 0 12px;font-size:16px;color:#E8A838;">Pregled promjena:</h3>
      <table style="width:100%;font-size:14px;color:rgba(255,255,255,0.9);" cellpadding="4">
        <tr><td style="padding:4px 0;">Gumb "Uredi podatke" na profilu člana</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Modal za uređivanje svih polja (ime, firma, OIB...)</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Novi backend endpoint za admin edit profila</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Multi-select filteri na listi članova</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Backend podrška za kombinirane filtere</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Sve postojeće funkcionalnosti netaknute</td><td style="text-align:right;color:#34D399;">✓</td></tr>
      </table>
    </div>

    <p style="text-align:center;font-size:13px;color:#94A3B8;margin-top:24px;">
      Sve promjene su live na <a href="https://members.ecommerce.hr/admin" style="color:#E8A838;text-decoration:none;font-weight:bold;">members.ecommerce.hr/admin</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>

</body>
</html>`;

  const subject = 'Ažuriranje sustava — 27.03.2026. — Uređivanje članova + Multi-select filteri';

  // Send to Marcel
  await sendEmail(
    'marcel@ecommerce.hr',
    subject,
    html,
    { templateName: 'system_update' },
  );
  console.log('Email poslan Marcelu!');

  // Send to Nikola
  await sendEmail(
    'nikola@lmkomunikacije.com',
    subject,
    html,
    { templateName: 'system_update' },
  );
  console.log('Email poslan Nikoli!');
}

main().catch(console.error);
