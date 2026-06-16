import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { setEmailLogger } from '@ecommerce-hr/email';
import { prisma } from '@ecommerce-hr/db';

const app = express();

// Trust proxy (required behind API Gateway / load balancer)
app.set('trust proxy', 1);

// Security headers
// helmet 8 ima ESM default export — cast na any izbjegava lažnu grešku kad Vercel
// runtime kompajlira funkciju bez esModuleInterop (helmet je u runtime-u callable).
app.use((helmet as any)());

// CORS — dopusti konfigurirane origine + bilo koju .ecommerce.hr poddomenu + localhost.
const corsAllowList = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
  'https://members.ecommerce.hr',
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / server-to-server
      let host = '';
      try { host = new URL(origin).hostname; } catch { /* ignore */ }
      const ok =
        corsAllowList.includes(origin) ||
        host.endsWith('.ecommerce.hr') ||
        host === 'localhost' ||
        host === '127.0.0.1';
      cb(null, ok);
    },
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Email logging
setEmailLogger(async ({ to, subject, body, memberId, templateName, trackingId }) => {
  await prisma.emailLog.create({
    data: { to, subject, body, memberId, templateName, trackingId },
  });
});

// Routes
registerRoutes(app);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
