import { prisma, type Payment } from '@ecommerce-hr/db';
import { DomainEvents } from '@ecommerce-hr/shared';
import { emitEvent } from '../lib/event-bus.js';
import { logger } from '../utils/logger.js';

export async function createPayment(
  memberId: string,
  amount: number,
  description: string,
): Promise<Payment> {
  return prisma.payment.create({
    data: {
      memberId,
      amount,
      description,
      status: 'PENDING',
    },
  });
}

export async function getPaymentsByMember(memberId: string): Promise<Payment[]> {
  return prisma.payment.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function processPaymentWebhook(
  paymentId: string,
  status: 'completed' | 'failed',
): Promise<Payment> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (status === 'completed') {
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // Create invoice for completed payment
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    await prisma.invoice.create({
      data: {
        memberId: payment.memberId,
        invoiceNumber,
        amount: payment.amount,
        status: 'PAID',
        issuedAt: new Date(),
        dueAt: new Date(),
        paidAt: new Date(),
        items: [{ description: payment.description, amount: Number(payment.amount) }],
      },
    });

    emitEvent(DomainEvents.PAYMENT_COMPLETED, {
      paymentId: updated.id,
      memberId: updated.memberId,
      amount: Number(updated.amount),
    }).catch((err) => logger.error(err, 'Failed to emit PAYMENT_COMPLETED event'));

    return updated;
  }

  // status === 'failed'
  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'FAILED' },
  });

  emitEvent(DomainEvents.PAYMENT_FAILED, {
    paymentId: updated.id,
    memberId: updated.memberId,
    amount: Number(updated.amount),
  }).catch((err) => logger.error(err, 'Failed to emit PAYMENT_FAILED event'));

  return updated;
}
