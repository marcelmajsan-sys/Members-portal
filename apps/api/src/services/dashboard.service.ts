import { prisma } from '@ecommerce-hr/db';

export async function getDashboardStats(userId: string, userRole?: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    totalMembers,
    activeMembers,
    pendingMembers,
    expiredMembers,
    suspendedMembers,
    offersWithSentStatus,
    revenueThisMonth,
    revenueThisYear,
    recentMembers,
    upcomingExpirations,
    monthlyRenewals,
    pendingTasks,
    unreadNotifications,
    benefitClaimsTotal,
    benefitClaimsThisMonth,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: 'ACTIVE' } }),
    prisma.member.count({ where: { status: 'PENDING' } }),
    prisma.member.count({ where: { status: 'EXPIRED' } }),
    prisma.member.count({ where: { status: 'SUSPENDED' } }),
    prisma.offer.count({ where: { status: 'SENT' } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startOfMonth },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startOfYear },
      },
    }),
    prisma.member.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      orderBy: { expiresAt: 'asc' },
      include: {
        company: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gte: now,
          lte: endOfMonth,
        },
      },
      orderBy: { expiresAt: 'asc' },
      include: {
        company: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.task.count({
      where: {
        status: { not: 'DONE' },
        ...(userRole === 'OPERATOR' ? { assignedToId: userId } : {}),
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.memberBenefit.count({ where: { status: 'CLAIMED' } }),
    prisma.memberBenefit.count({ where: { status: 'CLAIMED', claimedAt: { gte: startOfMonth } } }),
  ]);

  return {
    members: {
      total: totalMembers,
      active: activeMembers,
      pending: pendingMembers,
      expired: expiredMembers,
      suspended: suspendedMembers,
    },
    offersWithSentStatus,
    revenue: {
      thisMonth: revenueThisMonth._sum.amount ?? 0,
      thisYear: revenueThisYear._sum.amount ?? 0,
    },
    recentMembers,
    upcomingExpirations,
    monthlyRenewals,
    pendingTasks,
    unreadNotifications,
    memberClaims: {
      total: benefitClaimsTotal,
      thisMonth: benefitClaimsThisMonth,
    },
  };
}

export async function getDashboardAnalytics() {
  const now = new Date();

  // Last 12 months range
  const months: { start: Date; end: Date; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleDateString('hr-HR', { month: 'short', year: '2-digit' });
    months.push({ start, end, label });
  }

  // Fetch all data in parallel
  const [allMembers, allPayments, operators] = await Promise.all([
    prisma.member.findMany({
      select: {
        id: true,
        status: true,
        memberType: true,
        memberTier: true,
        joinedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true, paidAt: true },
    }),
    prisma.user.findMany({
      where: { role: 'OPERATOR' },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  // Fetch operator task stats
  const teamStats = await Promise.all(
    operators.map(async (op) => {
      const [todo, inProgress, done, overdue] = await Promise.all([
        prisma.task.count({ where: { assignedToId: op.id, status: 'TODO' } }),
        prisma.task.count({ where: { assignedToId: op.id, status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { assignedToId: op.id, status: 'DONE' } }),
        prisma.task.count({
          where: {
            assignedToId: op.id,
            dueAt: { lt: now },
            status: { not: 'DONE' },
          },
        }),
      ]);
      const total = todo + inProgress + done;
      return {
        id: op.id,
        name: `${op.firstName} ${op.lastName}`,
        todo,
        inProgress,
        done,
        overdue,
        total,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }),
  );

  // Use joinedAt or fallback to createdAt
  const getJoinDate = (mb: (typeof allMembers)[number]) => mb.joinedAt ?? mb.createdAt;

  // Monthly member growth (new members per month)
  const memberGrowth = months.map((m) => {
    const count = allMembers.filter(
      (mb) => getJoinDate(mb) >= m.start && getJoinDate(mb) < m.end,
    ).length;
    return { label: m.label, count };
  });

  // Monthly revenue
  const revenueByMonth = months.map((m) => {
    const total = allPayments
      .filter((p) => p.paidAt && p.paidAt >= m.start && p.paidAt < m.end)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { label: m.label, amount: total };
  });

  // Churn: expired members per month vs new
  const churnByMonth = months.map((m) => {
    const newMembers = allMembers.filter(
      (mb) => getJoinDate(mb) >= m.start && getJoinDate(mb) < m.end,
    ).length;
    const expired = allMembers.filter(
      (mb) =>
        mb.status === 'EXPIRED' &&
        mb.expiresAt &&
        mb.expiresAt >= m.start &&
        mb.expiresAt < m.end,
    ).length;
    return { label: m.label, new: newMembers, expired };
  });

  // Tier distribution
  const tierDistribution = {
    FREE: allMembers.filter((m) => m.memberTier === 'FREE').length,
    STANDARD: allMembers.filter((m) => m.memberTier === 'STANDARD').length,
    PREMIUM: allMembers.filter((m) => m.memberTier === 'PREMIUM').length,
  };

  // Type distribution
  const typeDistribution = {
    WEB_TRADER: allMembers.filter((m) => m.memberType === 'WEB_TRADER').length,
    SERVICE_PROVIDER: allMembers.filter((m) => m.memberType === 'SERVICE_PROVIDER').length,
    PHYSICAL: allMembers.filter((m) => m.memberType === 'PHYSICAL').length,
  };

  // Status distribution
  const statusDistribution = {
    ACTIVE: allMembers.filter((m) => m.status === 'ACTIVE').length,
    PENDING: allMembers.filter((m) => m.status === 'PENDING').length,
    EXPIRED: allMembers.filter((m) => m.status === 'EXPIRED').length,
    SUSPENDED: allMembers.filter((m) => m.status === 'SUSPENDED').length,
  };

  // Net growth (total members over time)
  let runningTotal = 0;
  const memberTimeline = months.map((m) => {
    const joined = allMembers.filter(
      (mb) => getJoinDate(mb) < m.end,
    ).length;
    runningTotal = joined;
    return { label: m.label, total: runningTotal };
  });

  return {
    memberGrowth,
    memberTimeline,
    revenueByMonth,
    churnByMonth,
    tierDistribution,
    typeDistribution,
    statusDistribution,
    teamStats,
  };
}

export async function getRecentActivity(limit: number) {
  const [recentLogs, recentPayments, recentMembers] = await Promise.all([
    prisma.automationLog.findMany({
      take: limit,
      orderBy: { executedAt: 'desc' },
      include: {
        sequence: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.payment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    }),
    prisma.member.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: { name: true },
        },
      },
    }),
  ]);

  return {
    automationLogs: recentLogs,
    payments: recentPayments,
    memberSignups: recentMembers,
  };
}
