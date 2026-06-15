import XLSX from 'xlsx';

const wb = XLSX.readFile('/Users/nikolabudisa/Downloads/Popis članova - aktualan.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Trgovci'], { defval: '' }) as Record<string, unknown>[];
const cols = Object.keys(rows[0]);

// Find exact academy column name
const acadCols = cols.filter((c) => c.toUpperCase().includes('AKADEM'));
console.log('Academy columns found:', acadCols.map((c) => JSON.stringify(c)));

if (acadCols.length > 0) {
  const col = acadCols[0];
  const vals = rows.map((r) => String(r[col]).trim()).filter((v) => v.length > 0);
  console.log('Non-empty values:', vals.length);
  console.log('Unique:', [...new Set(vals)]);

  // Show sample rows
  const samples = rows.filter((r) => String(r[col]).trim().length > 0).slice(0, 3);
  for (const s of samples) {
    console.log('  Email:', s['Email 1. član'], '| Academy:', JSON.stringify(s[col]));
  }
}
