import XLSX from 'xlsx';

const wb = XLSX.readFile('/Users/nikolabudisa/Downloads/Popis članova - aktualan.xlsx');

for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' }) as Record<string, unknown>[];
  const cols = Object.keys(rows[0] || {});
  const certCol = cols.find((c) => c.includes('CERTIFIKAT'));
  const acadCol = cols.find((c) => c.includes('AKADEMIJA'));
  const safeCol = cols.find((c) => c.includes('SAFE'));

  console.log(`\nSheet: ${name}`);
  console.log('Relevant columns:', [certCol, acadCol, safeCol].filter(Boolean).join(', ') || 'NONE');

  if (certCol) {
    const vals = rows.map((r) => String(r[certCol]).trim()).filter((v) => v.length > 0);
    const unique = [...new Set(vals)];
    console.log(`  ${certCol}: ${vals.length} entries, unique values:`, unique);
  }
  if (acadCol) {
    const vals = rows.map((r) => String(r[acadCol]).trim()).filter((v) => v.length > 0);
    const unique = [...new Set(vals)];
    console.log(`  ${acadCol}: ${vals.length} entries, unique values:`, unique);
  }
  if (safeCol) {
    const vals = rows.map((r) => String(r[safeCol]).trim()).filter((v) => v.length > 0);
    const unique = [...new Set(vals)];
    console.log(`  ${safeCol}: ${vals.length} entries, unique values:`, unique);
  }

  // Show a few sample rows with cert data
  if (certCol || acadCol || safeCol) {
    const samples = rows.filter((r) => {
      const c = certCol ? String(r[certCol]).trim() : '';
      const a = acadCol ? String(r[acadCol]).trim() : '';
      const s = safeCol ? String(r[safeCol]).trim() : '';
      return c.length > 0 || a.length > 0 || s.length > 0;
    }).slice(0, 5);

    for (const s of samples) {
      const email = String(s['Email 1. član'] || '').trim();
      const company = String(s['Naziv tvrtke'] || '').trim();
      console.log(`  Sample: ${email || company} -> cert=${certCol ? s[certCol] : '-'}, acad=${acadCol ? s[acadCol] : '-'}, safe=${safeCol ? s[safeCol] : '-'}`);
    }
  }
}
