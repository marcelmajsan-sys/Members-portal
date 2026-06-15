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

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'https://ecommerce-hr-os.vercel.app',
      'https://ecommerce-hr-web.vercel.app',
      'https://ecommerce-hr-member.vercel.app',
      'https://admin.ecommerce.hr',
    ],
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
