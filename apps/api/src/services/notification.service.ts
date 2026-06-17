import { prisma, type Notification, type NotificationType } from '@ecommerce-hr/db';

export async function createNotification(data: {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type ?? 'INFO',
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
    },
  });
}

// Notify all active staff (OWNER/OPERATOR) — used for admin-inbox events.
// Optionally exclude the user who triggered the action (so the author isn't pinged).
export async function notifyStaff(data: {
  type?: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  excludeUserId?: string;
}): Promise<void> {
  const staff = await prisma.user.findMany({
    where: { role: { in: ['OWNER', 'OPERATOR'] }, isActive: true },
    select: { id: true },
  });
  await Promise.all(
    staff
      .filter((s) => s.id !== data.excludeUserId)
      .map((s) =>
        prisma.notification.create({
          data: {
            userId: s.id,
            type: data.type ?? 'INFO',
            title: data.title,
            message: data.message,
            actionUrl: data.actionUrl,
          },
        }),
      ),
  );
}

export async function getNotifications(
  userId: string,
  page: number,
  limit: number,
  unreadOnly?: boolean,
): Promise<{ notifications: Notification[]; total: number }> {
  const where: Record<string, unknown> = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

export async function markAsRead(id: string): Promise<Notification> {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
