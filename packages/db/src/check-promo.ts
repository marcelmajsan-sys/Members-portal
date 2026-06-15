import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;
const p = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

async function main() {
  const m = await p.member.findFirst({
    where: { memberType: 'SERVICE_PROVIDER' },
    select: { id: true, promoKonferencija: true, promoMeetup: true, promoMagazin: true, promoWeb: true, promoOstalo: true },
  });
  console.log('Promo fields on first SERVICE_PROVIDER:', JSON.stringify(m, null, 2));

  // Try to update one
  if (m) {
    const updated = await p.member.update({
      where: { id: m.id },
      data: { promoKonferencija: true },
      select: { id: true, promoKonferencija: true, promoMeetup: true, promoMagazin: true },
    });
    console.log('After update:', JSON.stringify(updated, null, 2));

    // Read back
    const readBack = await p.member.findUnique({
      where: { id: m.id },
      select: { promoKonferencija: true },
    });
    console.log('Read back:', JSON.stringify(readBack));

    // Reset
    await p.member.update({ where: { id: m.id }, data: { promoKonferencija: false } });
  }
}

main().catch(console.error).finally(() => p.$disconnect());
