// @ts-nocheck
// Express app je pre-bundlan esbuildom (vidi build-vercel.mjs -> src/app.bundled.mjs)
// kako bi sve ovisnosti bile inline-ane i izbjegli "Cannot find package" u Vercel
// serverless runtime-u. Ova datoteka samo re-exporta gotov app kao handler.
import app from '../src/app.bundled.mjs';

export default app;
