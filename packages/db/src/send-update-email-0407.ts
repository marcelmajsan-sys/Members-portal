import { sendEmail } from '../../email/src/send.js';

async function main() {
  const html = `<!DOCTYPE html>
<html lang="hr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#333;">

  <!-- Header -->
  <div style="background:#1B365D;padding:28px 24px;text-align:center;">
    <img src="https://admin.ecommerce.hr/logo.png" alt="eCommerce Hrvatska" style="height:48px;" />
  </div>

  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">

    <!-- Title -->
    <div style="background:#fff;border-radius:12px;padding:32px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="color:#1B365D;margin:0 0 8px;font-size:24px;">Ažuriranje sustava</h1>
      <p style="color:#64748B;margin:0;font-size:14px;">7. travnja 2026. — Nove funkcionalnosti</p>
    </div>

    <!-- Section 1: Responsive / Mobile -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#D1FAE5;color:#065F46;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">1. Mobilni / Responsive prikaz</div>
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
        Cijeli admin panel je sada <strong>prilagođen za mobilne uređaje</strong>. Sve stranice pravilno rade na manjim ekranima.
      </p>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li>Dashboard, članovi, ponude, kalendar, automatizacija, tim, email predlošci</li>
        <li>Tablica članova skriva nepotrebne kolone na mobitelu</li>
        <li>Pretraživanje vidljivo na svim veličinama ekrana</li>
      </ul>
    </div>

    <!-- Section 2: Type Filters -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#DBEAFE;color:#1D4ED8;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">2. Filteri po tipu člana</div>
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
        Na listi članova dodani su novi filter pillovi za <strong>tip članstva</strong>:
      </p>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li><strong>Trgovac</strong> — web trgovci</li>
        <li><strong>Nuditelj</strong> — nuditelji usluga</li>
        <li><strong>Fizička osoba</strong> — fizički članovi</li>
      </ul>
      <p style="font-size:13px;color:#64748B;margin:12px 0 0;line-height:1.5;">
        Kombiniraju se sa svim ostalim filterima (status, certifikat, razina).
      </p>
    </div>

    <!-- Section 3: Last Email -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#FEF3C7;color:#92400E;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">3. Zadnji email u tablici članova</div>
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">
        Stupac "Akcije" zamijenjen je s <strong>"Zadnji email"</strong> — prikazuje naslov i datum zadnjeg poslanog emaila za svakog člana. Nema više slučajnog klika na "Obavijest".
      </p>
    </div>

    <!-- Section 4: Email Preview -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#EDE9FE;color:#6D28D9;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">4. Pregled poslanog emaila</div>
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
        U sekciji "Povijest emailova" na profilu člana, sada možete <strong>kliknuti na email</strong> da vidite točno što je poslano.
      </p>
      <p style="font-size:13px;color:#64748B;margin:0;line-height:1.5;">
        Otvara se modal s punim HTML previewom emaila. Radi za sve emailove poslane od danas nadalje.
      </p>
    </div>

    <!-- Section 5: Team Management -->
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <div style="background:#FCE7F3;color:#9D174D;font-weight:bold;font-size:13px;padding:4px 12px;border-radius:20px;">5. Upravljanje timom — potpuno nadograđeno</div>
      </div>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
        Stranica <strong>"Tim"</strong> ima puno više mogućnosti:
      </p>
      <ul style="margin:0;padding:0 0 0 20px;line-height:1.8;font-size:14px;color:#374151;">
        <li><strong>Prikaz role</strong> — svaka kartica prikazuje Owner ili Operator badge</li>
        <li><strong>Uređivanje podataka</strong> — ime, prezime, email — inline na kartici</li>
        <li><strong>Promjena role</strong> — prebacivanje između Operator i Owner jednim klikom</li>
        <li><strong>Promjena lozinke</strong> — Owner može promijeniti lozinku bilo kome u timu</li>
        <li><strong>Reaktivacija</strong> — deaktivirani zaposlenici se mogu ponovo aktivirati</li>
        <li><strong>Potvrda deaktivacije</strong> — "Jeste li sigurni?" prije deaktivacije</li>
      </ul>
    </div>

    <!-- Summary -->
    <div style="background:linear-gradient(135deg,#1B365D,#2A4A7A);border-radius:12px;padding:24px;margin-bottom:16px;color:#fff;">
      <h3 style="margin:0 0 12px;font-size:16px;color:#E8A838;">Pregled svih promjena:</h3>
      <table style="width:100%;font-size:14px;color:rgba(255,255,255,0.9);" cellpadding="4">
        <tr><td style="padding:4px 0;">Responsive/mobilni prikaz svih stranica</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Filteri po tipu člana (Trgovac, Nuditelj, Fizička)</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Zadnji email umjesto gumba "Obavijest"</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Klik na email → pregled HTML sadržaja</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Upravljanje timom — edit, role, lozinke</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Reaktivacija + potvrda deaktivacije</td><td style="text-align:right;color:#34D399;">✓</td></tr>
        <tr><td style="padding:4px 0;">Sve postojeće funkcionalnosti netaknute</td><td style="text-align:right;color:#34D399;">✓</td></tr>
      </table>
    </div>

    <p style="text-align:center;font-size:13px;color:#94A3B8;margin-top:24px;">
      Sve promjene su live na <a href="https://admin.ecommerce.hr" style="color:#E8A838;text-decoration:none;font-weight:bold;">admin.ecommerce.hr</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="background:#1B365D;padding:20px 24px;text-align:center;">
    <p style="margin:0 0 6px;color:#E8A838;font-size:12px;font-weight:bold;">eCommerce Hrvatska</p>
    <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">Republike Austrije 9, Zagreb · udruga@ecommerce.hr · +385 99 2025707</p>
  </div>

</body>
</html>`;

  const subject = 'Ažuriranje sustava — 07.04.2026. — Responsive, filteri, email preview, upravljanje timom';

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
