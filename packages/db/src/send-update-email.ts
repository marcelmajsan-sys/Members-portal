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
      <p style="color:#64748B;margin:0;font-size:14px;">26. ožujka 2026. — Pregled svih novih funkcionalnosti</p>
    </div>

    <!-- Section: Dashboard -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#DBEAFE;color:#1D4ED8;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">Dashboard</div>
      </div>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li><strong>"Poslana ponuda"</strong> — nova kartica prikazuje broj aktivnih ponuda sa statusom SENT (trenutno: 4)</li>
        <li><strong>Klikabilne kartice</strong> — sve statistike na vrhu dashboarda su sada klikabilne i vode na relevantne stranice</li>
        <li><strong>Obnove po mjesecu</strong> — nova sekcija s brzim filterima za mjesece (Ožujak, Travanj, Svibanj...) i status filterima (Sve/Aktivni/Istekli)</li>
        <li>Uklonjen dropdown — zamijenjeno brzim pill filterima za lakšu navigaciju</li>
      </ul>
    </div>

    <!-- Section: Members -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#D1FAE5;color:#065F46;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">Članovi</div>
      </div>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li><strong>Certifikat/Akademija/Safe Shop</strong> — nova polja importirana iz Excela i prikazana na profilu svakog člana</li>
        <li><strong>Brzi filteri (pillovi)</strong> — zamijenjeni svi dropdowni s brzim tab filterima: Sve, Aktivni, Istekli, Certifikat, Bez certifikata, Akademija</li>
        <li><strong>Broj članova</strong> — svaki filter prikazuje broj rezultata u badgeu</li>
        <li><strong>Bilješke iz Excela</strong> — importirano <strong>30 bilješki</strong> iz stupca "komentar" u Bilješke sekciju svakog člana</li>
        <li><strong>Sat u bilješkama</strong> — bilješke sada prikazuju datum I sat (ne samo datum)</li>
      </ul>
    </div>

    <!-- Section: Email Tracking -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#EDE9FE;color:#5B21B6;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">Email Tracking</div>
      </div>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li><strong>Open tracking</strong> — svaki email sada sadrži nevidljivi tracking pixel koji bilježi kad član otvori email</li>
        <li><strong>Click tracking</strong> — linkovi u emailovima mogu pratiti klikove članova</li>
        <li><strong>Prikaz na profilu</strong> — u "Povijest emailova" sekciji svakog člana prikazuju se badgeovi:
          <br/><span style="background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:bold;">Otvoreno</span>
          <span style="background:#EDE9FE;color:#5B21B6;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:bold;">Kliknuto</span>
        </li>
        <li>Tracking <strong>ne utječe</strong> na postojeći sustav — ako tracking ne radi, emailovi se i dalje normalno šalju</li>
      </ul>
    </div>

    <!-- Section: Technical -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#FEF3C7;color:#92400E;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">Tehničko</div>
      </div>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li>3 nova polja u bazi: <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:13px;">hasCertificate</code>, <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:13px;">hasAcademy</code>, <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:13px;">safeShopStatus</code></li>
        <li>3 nova polja za tracking: <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:13px;">trackingId</code>, <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:13px;">openedAt</code>, <code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:13px;">clickedAt</code></li>
        <li>Lambda redeployana s najnovijim kodom</li>
        <li>Vercel frontend automatski deployan</li>
        <li><strong>Ništa postojeće nije promijenjeno</strong> — sve je aditivno, svi postojeći endpointi rade kao prije</li>
      </ul>
    </div>

    <!-- Summary -->
    <div style="background:linear-gradient(135deg,#1B365D,#2A4A7A);border-radius:12px;padding:24px;margin-bottom:16px;color:#fff;">
      <h3 style="margin:0 0 12px;font-size:16px;color:#E8A838;">Što je sve novo ukratko:</h3>
      <table style="width:100%;font-size:14px;color:rgba(255,255,255,0.9);" cellpadding="4">
        <tr><td style="padding:4px 0;">Dashboard "Poslana ponuda" kartica</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Obnove po mjesecu s pill filterima</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Klikabilne statistike na dashboardu</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Certifikat/Akademija/Safe Shop podaci</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Pill filteri umjesto dropdowna (članovi)</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">30 bilješki importirano iz Excela</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Datum + sat u bilješkama</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Email open/click tracking</td><td style="text-align:right;color:#34D399;">✓</td></tr>
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

  await sendEmail(
    'nikola@lmkomunikacije.com',
    'Ažuriranje sustava — 26.03.2026. — Nove funkcionalnosti',
    html,
    { templateName: 'system_update' },
  );

  console.log('Email poslan Nikoli!');
}

main().catch(console.error);
