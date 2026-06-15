// Pre-bundla Express app u jedan samostalan ESM fajl za Vercel serverless.
// Sve ovisnosti se inline-aju (pa nema "Cannot find package" u runtime-u),
// osim @prisma/client koji mora ostati vanjski (nosi svoj engine binarni file).
import { build } from 'esbuild';

await build({
  entryPoints: ['src/app.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'src/app.bundled.mjs',
  external: ['@prisma/client', '.prisma/client'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});

console.log('✓ Bundlano u src/app.bundled.mjs');
