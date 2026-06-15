export const DomainEvents = {
  // Member events
  MEMBER_REGISTERED: 'member.registered',
  MEMBER_ACTIVATED: 'member.activated',
  MEMBER_EXPIRED: 'member.expired',
  MEMBER_RENEWED: 'member.renewed',
  MEMBER_SUSPENDED: 'member.suspended',
  MEMBER_UPDATED: 'member.updated',

  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_CANCELLED: 'invoice.cancelled',

  // Audit events
  AUDIT_REQUESTED: 'audit.requested',
  AUDIT_IN_PROGRESS: 'audit.in_progress',
  AUDIT_COMPLETED: 'audit.completed',
  AUDIT_FAILED: 'audit.failed',

  // Certification events
  CERTIFICATION_SUBMITTED: 'certification.submitted',
  CERTIFICATION_UNDER_REVIEW: 'certification.under_review',
  CERTIFICATION_APPROVED: 'certification.approved',
  CERTIFICATION_REJECTED: 'certification.rejected',
  CERTIFICATION_EXPIRED: 'certification.expired',

  // Competitor events
  COMPETITOR_CREATED: 'competitor.created',
  COMPETITOR_SCAN_COMPLETED: 'competitor.scan_completed',
  COMPETITOR_PRICE_SCAN_COMPLETED: 'competitor.price_scan_completed',

  // Market intelligence events
  MARKET_INTEL_PUBLISHED: 'market_intel.published',

  // Notification events
  NOTIFICATION_SENT: 'notification.sent',
  EMAIL_SENT: 'email.sent',
} as const;

export type DomainEvent = (typeof DomainEvents)[keyof typeof DomainEvents];
