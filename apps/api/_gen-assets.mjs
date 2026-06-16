// Generira src/assets/embedded-assets.ts s base64 fontovima + logom,
// da budu ugrađeni u esbuild bundle (rade i lokalno i na Vercelu, bez fs).
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const assetsDir = path.join(here, 'src', 'assets');

const reg = fs.readFileSync(path.join(assetsDir, 'Roboto-Regular.ttf')).toString('base64');
const bold = fs.readFileSync(path.join(assetsDir, 'Roboto-Bold.ttf')).toString('base64');

let logo = '';
const logoSrc = path.join(here, '..', 'os', 'public', 'logo.png');
if (fs.existsSync(logoSrc)) logo = fs.readFileSync(logoSrc).toString('base64');

const out = `// AUTO-GENERIRANO (apps/api/_gen-assets.mjs) — ne uređivati ručno.
// Fontovi (Roboto, Apache-2.0) i logo ugrađeni kao base64 da budu dostupni
// u Vercel serverless bundle-u (esbuild ne kopira binarne fajlove s diska).
/* eslint-disable */
export const robotoRegularBase64 = ${JSON.stringify(reg)};
export const robotoBoldBase64 = ${JSON.stringify(bold)};
export const logoBase64 = ${JSON.stringify(logo)};
`;

fs.writeFileSync(path.join(assetsDir, 'embedded-assets.ts'), out);
console.log(`Generirano embedded-assets.ts — reg ${(reg.length/1024).toFixed(0)}KB, bold ${(bold.length/1024).toFixed(0)}KB, logo ${(logo.length/1024).toFixed(0)}KB`);
