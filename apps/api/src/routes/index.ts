import type { Express } from 'express';
import { defaultLimiter } from '../middleware/rate-limit.js';
import authRoutes from './auth.routes.js';
import publicRoutes from './public.routes.js';
import memberRoutes from './member.routes.js';
import osRoutes from './os.routes.js';
import taskRoutes from './task.routes.js';
import notificationRoutes from './notification.routes.js';
import webhookRoutes from './webhook.routes.js';
import sequenceRoutes from './sequence.routes.js';
import auditRoutes from './audit.routes.js';
import safeshopRoutes from './safeshop.routes.js';
import academyRoutes from './academy.routes.js';
import legalRoutes from './legal.routes.js';
import competitorRoutes from './competitor.routes.js';
import marketIntelligenceRoutes from './market-intelligence.routes.js';
import benchmarkRoutes from './benchmark.routes.js';
import partnerRoutes from './partner.routes.js';
import employeeRoutes from './employee.routes.js';
import taskAnalyticsRoutes from './task-analytics.routes.js';
import priceMonitorRoutes from './price-monitor.routes.js';
import memberProductRoutes from './member-product.routes.js';
import emailTemplateRoutes from './email-template.routes.js';
import calendarEventRoutes from './calendar-event.routes.js';

export function registerRoutes(app: Express): void {
  // Apply default rate limiter to all routes
  app.use(defaultLimiter);

  // Mount route modules
  app.use('/api/auth', authRoutes);
  app.use('/api', publicRoutes);
  app.use('/api/member', memberRoutes);
  app.use('/api/member/competitors', competitorRoutes);
  app.use('/api/member/competitors', priceMonitorRoutes);
  app.use('/api/member/products', memberProductRoutes);
  app.use('/api/member/market-intelligence', marketIntelligenceRoutes);
  app.use('/api/member/benchmarks', benchmarkRoutes);
  app.use('/api/member/partners', partnerRoutes);
  app.use('/api/os', osRoutes);
  app.use('/api/os/tasks', taskRoutes);
  app.use('/api/os/sequences', sequenceRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/safeshop', safeshopRoutes);
  app.use('/api/academy', academyRoutes);
  app.use('/api/legal', legalRoutes);
  app.use('/api/os/employees', employeeRoutes);
  app.use('/api/os/tasks/analytics', taskAnalyticsRoutes);
  app.use('/api/os/email-templates', emailTemplateRoutes);
  app.use('/api/os/calendar-events', calendarEventRoutes);
}
