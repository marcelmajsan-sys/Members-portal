import { prisma, type Member, type MemberType, type MemberStatus, type MemberTier } from '@ecommerce-hr/db';
import { getMembershipPrice, getMembershipBenefits, isTierAvailable } from '../config/membership.js';

export async function getMemberByUserId(userId: string): Promise<Member | null> {
  return prisma.member.findUnique({
    where: { userId },
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
  });
}

export async function getAllMembers(
  page: number,
  limit: number,
  filters?: { tier?: MemberTier; type?: MemberType | MemberType[]; status?: MemberStatus | MemberStatus[]; certificate?: string | string[]; expiringDays?: number; expiryMonth?: string; companyId?: string; promoKonferencija?: boolean; promoMeetup?: boolean; promoMagazin?: boolean; promoWeb?: boolean; promoOstalo?: boolean; hasCertificate?: boolean },
): Promise<{ members: Member[]; total: number }> {
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (filters?.companyId) where.companyId = filters.companyId;
  if (filters?.tier) where.memberTier = filters.tier;
  if (filters?.type) {
    if (Array.isArray(filters.type)) {
      where.memberType = { in: filters.type };
    } else {
      where.memberType = filters.type;
    }
  }

  // Support single or multiple statuses
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  }

  // Expiring soon: ACTIVE members with expiresAt within N days
  if (filters?.expiringDays) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + filters.expiringDays);
    where.status = 'ACTIVE';
    where.expiresAt = { gte: now, lte: future };
  }

  // Expiry month: members whose membership expires within the given calendar month
  if (filters?.expiryMonth) {
    const [year, mon] = filters.expiryMonth.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);
    where.expiresAt = { gte: start, lte: end };
  }

  // Boolean field filters (promo, certificate)
  if (filters?.promoKonferencija !== undefined) where.promoKonferencija = filters.promoKonferencija;
  if (filters?.promoMeetup !== undefined) where.promoMeetup = filters.promoMeetup;
  if (filters?.promoMagazin !== undefined) where.promoMagazin = filters.promoMagazin;
  if (filters?.promoWeb !== undefined) where.promoWeb = filters.promoWeb;
  if (filters?.promoOstalo !== undefined) where.promoOstalo = { not: null };
  if (filters?.hasCertificate !== undefined) where.hasCertificate = filters.hasCertificate;

  // Support single or multiple certificate filters (combined with OR)
  if (filters?.certificate) {
    const certs = Array.isArray(filters.certificate) ? filters.certificate : [filters.certificate];
    const certConditions: Record<string, unknown>[] = [];
    for (const c of certs) {
      if (c === 'HAS_CERT') certConditions.push({ hasCertificate: true });
      if (c === 'NO_CERT') certConditions.push({ hasCertificate: false });
      if (c === 'HAS_ACADEMY') certConditions.push({ hasAcademy: true });
    }
    if (certConditions.length === 1) {
      Object.assign(where, certConditions[0]);
    } else if (certConditions.length > 1) {
      where.OR = certConditions;
    }
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
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
        emailLogs: {
          select: { subject: true, sentAt: true },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total };
}

export async function searchMembers(query: string, limit = 8) {
  const q = query.trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(w => w.length > 0);

  // If multiple words, search for each word matching firstName/lastName (AND)
  const where = words.length > 1
    ? {
        AND: words.map(word => ({
          OR: [
            { user: { firstName: { contains: word, mode: 'insensitive' as const } } },
            { user: { lastName: { contains: word, mode: 'insensitive' as const } } },
          ],
        })),
      }
    : {
        OR: [
          { user: { firstName: { contains: q, mode: 'insensitive' as const } } },
          { user: { lastName: { contains: q, mode: 'insensitive' as const } } },
          { user: { email: { contains: q, mode: 'insensitive' as const } } },
          { company: { name: { contains: q, mode: 'insensitive' as const } } },
          { company: { oib: { contains: q } } },
          { company: { website: { contains: q, mode: 'insensitive' as const } } },
        ],
      };

  return prisma.member.findMany({
    where,
    take: limit,
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
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateMember(
  memberId: string,
  data: Partial<{
    memberType: MemberType;
    memberTier: MemberTier;
    status: MemberStatus;
    notes: string;
    expiresAt: Date;
    hasCertificate: boolean;
    hasAcademy: boolean;
    safeShopStatus: string | null;
    magazinDobrePrice: boolean;
    promoKonferencija: boolean;
    promoMeetup: boolean;
    promoMagazin: boolean;
    promoWeb: boolean;
    promoOstalo: string | null;
  }>,
): Promise<Member> {
  return prisma.member.update({
    where: { id: memberId },
    data,
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
  });
}

export async function updateMemberTier(
  memberId: string,
  tier: MemberTier,
  options?: { charge?: boolean },
): Promise<{ member: Member; charged?: number }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { memberType: true, memberTier: true },
  });

  if (!member) throw new Error('Member not found');

  if (!isTierAvailable(member.memberType, tier)) {
    throw new Error(`Razina ${tier} nije dostupna za tip ${member.memberType}`);
  }

  let charged: number | undefined;

  if (options?.charge) {
    const oldPrice = getMembershipPrice(member.memberType, member.memberTier) ?? 0;
    const newPrice = getMembershipPrice(member.memberType, tier) ?? 0;
    const diff = newPrice - oldPrice;

    if (diff > 0) {
      await prisma.payment.create({
        data: {
          memberId,
          amount: diff,
          description: `Nadoplata za nadogradnju razine (${member.memberTier} → ${tier})`,
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });
      charged = diff;
    }
  }

  const updated = await updateMember(memberId, { memberTier: tier });
  return { member: updated, charged };
}

export async function getMemberDashboard(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!member) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [competitorsTracked, unreadNotifications, priceAlerts] = await Promise.all([
    prisma.competitor.count({ where: { isActive: true } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.priceAlert.count({ where: { memberId: member.id, createdAt: { gte: sevenDaysAgo } } }),
  ]);

  return {
    member,
    stats: {
      competitorsTracked,
      unreadNotifications,
      priceAlerts,
    },
  };
}

export async function updateMemberProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    website?: string;
  },
) {
  const member = await prisma.member.findUnique({
    where: { userId },
    include: { user: { select: { id: true } }, company: { select: { id: true } } },
  });

  if (!member) throw new Error('Member not found');

  const { firstName, lastName, companyName, address, city, postalCode, phone, website } = data;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: member.userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      },
    }),
    prisma.company.update({
      where: { id: member.companyId },
      data: {
        ...(companyName !== undefined && { name: companyName }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(postalCode !== undefined && { zip: postalCode }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
      },
    }),
  ]);

  return getMemberByUserId(userId);
}

export async function getMemberInvoices(userId: string, page: number, limit: number) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!member) return null;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { memberId: member.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.count({ where: { memberId: member.id } }),
  ]);

  return { invoices: items, total };
}

export async function getMemberEmails(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!member) return null;

  return prisma.emailLog.findMany({
    where: { memberId: member.id },
    orderBy: { sentAt: 'desc' },
    select: { id: true, subject: true, status: true, sentAt: true, to: true, body: true },
  });
}

export async function getMemberOffers(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!member) return null;

  return prisma.offer.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, offerNumber: true, amount: true, currency: true,
      items: true, status: true, validUntil: true, respondedAt: true, createdAt: true,
    },
  });
}

// Pogodnosti (benefiti) dodijeljene članu — po tipu članstva i/ili pojedinačno.
// Vraća { available, claimed }.
export async function getMemberPerks(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true, memberType: true, hasCertificate: true },
  });
  if (!member) return null;

  const [typeBenefits, grants] = await Promise.all([
    prisma.benefit.findMany({
      where: { isActive: true, memberTypes: { has: member.memberType } },
    }),
    prisma.memberBenefit.findMany({
      where: { memberId: member.id },
      include: { benefit: true },
    }),
  ]);

  const grantByBenefit = new Map(grants.map((g) => [g.benefitId, g]));

  type BenefitLike = { id: string; title: string; description: string | null; category: string | null; actionUrl: string | null; actionLabel: string | null; condition: string | null };
  const shape = (b: BenefitLike, status: string, claimedAt: Date | null, statusNote?: string) =>
    ({ id: b.id, title: b.title, description: b.description, category: b.category, actionUrl: b.actionUrl, actionLabel: b.actionLabel, condition: b.condition, status, claimedAt, statusNote: statusNote ?? null });

  const available: ReturnType<typeof shape>[] = [];
  const claimed: ReturnType<typeof shape>[] = [];

  // Posebni uvjet: "NO_CERTIFICATE" → ako član već ima Safe Shop certifikat, benefit je
  // ispunjen (prikaži kao aktivan, bez akcije); inače je dostupan sa "ZATRAŽI".
  const place = (b: BenefitLike, g?: { status: string; claimedAt: Date | null }) => {
    if (b.condition === 'NO_CERTIFICATE' && member.hasCertificate) {
      claimed.push(shape(b, 'FULFILLED', null, 'Certifikat aktivan'));
      return;
    }
    if (g?.status === 'CLAIMED') claimed.push(shape(b, 'CLAIMED', g.claimedAt));
    else available.push(shape(b, 'AVAILABLE', null));
  };

  // Type-targeted benefits
  for (const b of typeBenefits) place(b, grantByBenefit.get(b.id) ?? undefined);

  // Individually-assigned benefits not already covered by type targeting
  const typeIds = new Set(typeBenefits.map((b) => b.id));
  for (const g of grants) {
    if (typeIds.has(g.benefitId)) continue;
    if (!g.benefit.isActive) continue;
    place(g.benefit, g);
  }

  return { available, claimed };
}

// Član iskorištava benefit (gumb "Prijava")
export async function claimMemberPerk(userId: string, benefitId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true, memberType: true, status: true, hasCertificate: true, user: { select: { firstName: true, lastName: true, email: true } }, company: { select: { name: true } } },
  });
  if (!member) return { error: 'NO_MEMBER' as const };

  // Samo aktivni članovi mogu iskoristiti benefit
  if (member.status !== 'ACTIVE') return { error: 'INACTIVE' as const };

  const benefit = await prisma.benefit.findUnique({ where: { id: benefitId } });
  if (!benefit || !benefit.isActive) return { error: 'NOT_FOUND' as const };

  // Uvjet "NO_CERTIFICATE": član koji već ima certifikat ne može (ni ne treba) zatražiti
  if (benefit.condition === 'NO_CERTIFICATE' && member.hasCertificate) {
    return { error: 'ALREADY_FULFILLED' as const };
  }

  const existing = await prisma.memberBenefit.findUnique({
    where: { benefitId_memberId: { benefitId, memberId: member.id } },
  });
  const eligible = benefit.memberTypes.includes(member.memberType) || !!existing;
  if (!eligible) return { error: 'NOT_ELIGIBLE' as const };

  if (existing?.status === 'CLAIMED') {
    return { ok: true as const, alreadyClaimed: true, member, benefit };
  }

  await prisma.memberBenefit.upsert({
    where: { benefitId_memberId: { benefitId, memberId: member.id } },
    update: { status: 'CLAIMED', claimedAt: new Date() },
    create: { benefitId, memberId: member.id, status: 'CLAIMED', claimedAt: new Date() },
  });

  return { ok: true as const, alreadyClaimed: false, member, benefit };
}

export async function getMemberBenefits(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true, memberType: true, memberTier: true },
  });

  if (!member) return null;

  return {
    memberType: member.memberType,
    memberTier: member.memberTier,
    benefits: getMembershipBenefits(member.memberType, member.memberTier),
  };
}

export async function deleteMember(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true },
  });
  if (!member) throw new Error('Member not found');

  await prisma.$transaction([
    prisma.memberProduct.deleteMany({ where: { memberId } }),
    prisma.priceAlert.deleteMany({ where: { memberId } }),
    prisma.offer.deleteMany({ where: { memberId } }),
    prisma.memberNote.deleteMany({ where: { memberId } }),
    prisma.emailLog.deleteMany({ where: { memberId } }),
    prisma.starterShop.deleteMany({ where: { memberId } }),
    prisma.payment.deleteMany({ where: { memberId } }),
    prisma.invoice.deleteMany({ where: { memberId } }),
    prisma.academyEnrollment.deleteMany({ where: { memberId } }),
    prisma.academyCertificate.deleteMany({ where: { memberId } }),
    prisma.safeShopCertification.deleteMany({ where: { memberId } }),
    prisma.legalQuery.deleteMany({ where: { memberId } }),
    prisma.notification.deleteMany({ where: { userId: member.userId } }),
    prisma.refreshToken.deleteMany({ where: { userId: member.userId } }),
    prisma.pushToken.deleteMany({ where: { userId: member.userId } }),
    prisma.member.delete({ where: { id: memberId } }),
    prisma.user.delete({ where: { id: member.userId } }),
  ]);
}

export async function renewMembership(
  memberId: string,
  options?: { amount?: number; note?: string },
): Promise<{ member: Member; newExpiresAt: Date; amount: number }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });

  if (!member) throw new Error('Member not found');

  if (member.memberTier === 'FREE') {
    throw new Error('Besplatni članovi ne mogu produžiti članstvo. Nadogradite razinu na Standard ili Premium.');
  }

  const tierPrice = getMembershipPrice(member.memberType, member.memberTier);
  if (tierPrice === null) {
    throw new Error(`Razina ${member.memberTier} nije dostupna za tip ${member.memberType}`);
  }

  const now = new Date();
  const currentExpiry = member.expiresAt ? new Date(member.expiresAt) : null;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiresAt = new Date(baseDate);
  newExpiresAt.setDate(newExpiresAt.getDate() + 365);

  const amount = options?.amount ?? tierPrice;
  const description = options?.note
    ? `Članarina - produženje (${options.note})`
    : 'Članarina - produženje';

  await prisma.payment.create({
    data: {
      memberId,
      amount,
      description,
      status: 'COMPLETED',
      paidAt: now,
    },
  });

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: { expiresAt: newExpiresAt, status: 'ACTIVE' },
    include: {
      company: true,
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  return { member: updatedMember, newExpiresAt, amount };
}

export async function adminUpdateMemberProfile(
  memberId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    oib?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    website?: string;
    memberType?: MemberType;
    joinedAt?: Date;
    expiresAt?: Date;
  },
) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true } }, company: { select: { id: true } } },
  });

  if (!member) throw new Error('Member not found');

  const { firstName, lastName, email, companyName, oib, address, city, postalCode, phone, website, memberType, joinedAt, expiresAt } = data;

  const ops = [];

  // Update user fields
  const userData: Record<string, string> = {};
  if (firstName !== undefined) userData.firstName = firstName;
  if (lastName !== undefined) userData.lastName = lastName;
  if (email !== undefined) userData.email = email;
  if (Object.keys(userData).length > 0) {
    ops.push(prisma.user.update({ where: { id: member.userId }, data: userData }));
  }

  // Update company fields
  const companyData: Record<string, string> = {};
  if (companyName !== undefined) companyData.name = companyName;
  if (oib !== undefined) companyData.oib = oib;
  if (address !== undefined) companyData.address = address;
  if (city !== undefined) companyData.city = city;
  if (postalCode !== undefined) companyData.zip = postalCode;
  if (phone !== undefined) companyData.phone = phone;
  if (website !== undefined) companyData.website = website;
  if (Object.keys(companyData).length > 0) {
    ops.push(prisma.company.update({ where: { id: member.companyId }, data: companyData }));
  }

  // Update member fields
  const memberData: Record<string, unknown> = {};
  if (memberType !== undefined) memberData.memberType = memberType;
  if (joinedAt !== undefined) memberData.joinedAt = joinedAt;
  if (expiresAt !== undefined) memberData.expiresAt = expiresAt;
  if (Object.keys(memberData).length > 0) {
    ops.push(prisma.member.update({ where: { id: memberId }, data: memberData }));
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  return prisma.member.findUnique({
    where: { id: memberId },
    include: {
      company: true,
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
}

export async function checkMemberExpiry(memberId: string): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { expiresAt: true },
  });

  if (!member || !member.expiresAt) {
    return false;
  }

  return member.expiresAt < new Date();
}
