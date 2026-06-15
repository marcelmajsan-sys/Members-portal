import { prisma } from './index.js';

// Pre-computed bcrypt hash for "admin123"
const PASSWORD_HASH = '$2a$10$S3y9eKetkN9X0iuCgcVvPebLOKROEaHIG8VH7glYc8DOYzPWEFCMm';

async function main() {
  console.log('Seeding database...');

  // ─── Users ───────────────────────────────────────────────────────────────

  const marcel = await prisma.user.upsert({
    where: { email: 'marcel@ecommerce.hr' },
    update: {},
    create: {
      email: 'marcel@ecommerce.hr',
      passwordHash: PASSWORD_HASH,
      firstName: 'Marcel',
      lastName: 'Šturlić',
      role: 'OWNER',
      isActive: true,
    },
  });
  console.log(`Created user: ${marcel.firstName} ${marcel.lastName} (${marcel.role})`);

  const iva = await prisma.user.upsert({
    where: { email: 'iva@ecommerce.hr' },
    update: {},
    create: {
      email: 'iva@ecommerce.hr',
      passwordHash: PASSWORD_HASH,
      firstName: 'Iva',
      lastName: 'Operator',
      role: 'OPERATOR',
      isActive: true,
    },
  });
  console.log(`Created user: ${iva.firstName} ${iva.lastName} (${iva.role})`);

  // ─── Test Members with Companies ─────────────────────────────────────────

  const testMembers = [
    {
      email: 'test1@example.com',
      firstName: 'Test',
      lastName: 'WebTrader',
      company: {
        name: 'WebShop d.o.o.',
        oib: '12345678901',
        address: 'Ilica 1',
        city: 'Zagreb',
        zip: '10000',
      },
      memberType: 'WEB_TRADER' as const,
      memberNumber: 'MEM-2026-001',
    },
    {
      email: 'test2@example.com',
      firstName: 'Test',
      lastName: 'ServiceProvider',
      company: {
        name: 'Digital Agency d.o.o.',
        oib: '23456789012',
        address: 'Vukovarska 2',
        city: 'Zagreb',
        zip: '10000',
      },
      memberType: 'SERVICE_PROVIDER' as const,
      memberNumber: 'MEM-2026-002',
    },
    {
      email: 'test3@example.com',
      firstName: 'Test',
      lastName: 'PhysicalStore',
      company: {
        name: 'Brick Store d.o.o.',
        oib: '34567890123',
        address: 'Savska 3',
        city: 'Split',
        zip: '21000',
      },
      memberType: 'PHYSICAL' as const,
      memberNumber: 'MEM-2026-003',
    },
  ];

  for (const tm of testMembers) {
    const user = await prisma.user.upsert({
      where: { email: tm.email },
      update: {},
      create: {
        email: tm.email,
        passwordHash: PASSWORD_HASH,
        firstName: tm.firstName,
        lastName: tm.lastName,
        role: 'MEMBER',
        isActive: true,
      },
    });

    const company = await prisma.company.upsert({
      where: { oib: tm.company.oib },
      update: {},
      create: tm.company,
    });

    // Check if member already exists for this user
    const existingMember = await prisma.member.findUnique({
      where: { userId: user.id },
    });

    if (!existingMember) {
      await prisma.member.create({
        data: {
          userId: user.id,
          companyId: company.id,
          memberType: tm.memberType,
          status: 'ACTIVE',
          memberNumber: tm.memberNumber,
          joinedAt: new Date(),
        },
      });
    }

    console.log(`Created member: ${tm.company.name} (${tm.memberType})`);
  }

  // ─── Test Partner ────────────────────────────────────────────────────────

  const partner = await prisma.partner.upsert({
    where: { id: 'seed-partner-1' },
    update: {},
    create: {
      id: 'seed-partner-1',
      name: 'Test Partner d.o.o.',
      contactEmail: 'partner@example.com',
      contactPhone: '+385 1 234 5678',
      website: 'https://test-partner.hr',
      description: 'A test partner for development purposes.',
      isActive: true,
    },
  });
  console.log(`Created partner: ${partner.name}`);

  // ─── Test Conference ─────────────────────────────────────────────────────

  const conference = await prisma.conference.upsert({
    where: { slug: 'ecommerce-connect-2026' },
    update: {},
    create: {
      name: 'eCommerce Connect 2026',
      slug: 'ecommerce-connect-2026',
      description: 'Annual eCommerce conference bringing together industry leaders.',
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-09-17'),
      location: 'Zagreb, Croatia',
      isActive: true,
    },
  });
  console.log(`Created conference: ${conference.name}`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
