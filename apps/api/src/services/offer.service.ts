import { prisma } from '@ecommerce-hr/db';
import type { MemberType, MemberTier } from '@ecommerce-hr/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import bwipjs from 'bwip-js';
import { getMembershipPrice, TIER_LABELS } from '../config/membership.js';
import { robotoRegularBase64, robotoBoldBase64, logoBase64 } from '../assets/embedded-assets.js';
import { logger } from '../utils/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSOCIATION = {
  name: 'Udruga eCommerce Hrvatska',
  address: 'Republike Austrije 9, ZAGREB 10000',
  oib: '17475291081',
  vat: 'HR17475291081',
  iban: 'HR7123400091110780192',
  swift: 'PBZGHR2X',
  email: 'udruga@ecommerce.hr',
  mb: '04398122',
  rno: '0331489',
  web: 'www.ecommerce.hr',
};

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Web trgovac',
  SERVICE_PROVIDER: 'Nuditelj usluga',
  PHYSICAL: 'Fizički',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}.`;
}

function formatAmount(n: number): string {
  return n.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function getNextOfferNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.offer.count({
    where: { offerNumber: { startsWith: `${year}` } },
  });
  return `${year}${String(count + 1).padStart(4, '0')}`;
}

// ─── Font loading ─────────────────────────────────────────────────────────────

let fontRegularBytes: Uint8Array | null = null;
let fontBoldBytes: Uint8Array | null = null;

function loadFonts() {
  if (fontRegularBytes && fontBoldBytes) return;
  // Fontovi su ugrađeni kao base64 (assets/embedded-assets.ts) — uvijek dostupni,
  // i lokalno i u Vercel serverless bundle-u. Roboto podržava hrvatske znakove.
  fontRegularBytes = Buffer.from(robotoRegularBase64, 'base64');
  fontBoldBytes = Buffer.from(robotoBoldBase64, 'base64');
}

// ─── Logo loading ─────────────────────────────────────────────────────────────

let logoBytes: Uint8Array | null = null;

function loadLogo() {
  if (logoBytes) return logoBytes;
  if (logoBase64) logoBytes = Buffer.from(logoBase64, 'base64');
  return logoBytes;
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

export async function generateOfferPDF(
  member: {
    id: string;
    memberType: MemberType;
    memberTier: MemberTier;
    expiresAt: Date | null;
    user: { firstName: string; lastName: string; email: string };
    company: { name: string; oib: string; address: string; city: string; zip: string };
  },
  offerNumber: string,
  amount: number,
  step: number,
): Promise<Buffer> {
  loadFonts();

  const pdfDoc = await PDFDocument.create();

  // Register fontkit for custom fonts
  let fontRegular: any;
  let fontBold: any;

  if (fontRegularBytes && fontBoldBytes) {
    pdfDoc.registerFontkit(fontkit);
    fontRegular = await pdfDoc.embedFont(fontRegularBytes, { subset: true });
    fontBold = await pdfDoc.embedFont(fontBoldBytes, { subset: true });
  } else {
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  const darkBlue = rgb(0.106, 0.212, 0.365); // #1B365D
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  let y = height - margin;

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 5);

  const periodStart = member.expiresAt && member.expiresAt > now
    ? new Date(member.expiresAt) : now;
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const reference = `HR00 ${now.getFullYear()}${offerNumber}`;
  const tierLabel = TIER_LABELS[member.memberTier] || member.memberTier;
  const typeLabel = TYPE_LABELS[member.memberType] || member.memberType;

  // ─── Logo + Association info (side by side) ─────────────────────────
  const logo = loadLogo();
  const textX = margin + 135; // text starts right of logo
  let logoBottomY = y;

  if (logo) {
    try {
      const logoImage = await pdfDoc.embedPng(logo);
      const logoScale = 120 / logoImage.width;
      const logoH = logoImage.height * logoScale;
      page.drawImage(logoImage, {
        x: margin,
        y: y - logoH,
        width: 120,
        height: logoH,
      });
      logoBottomY = y - logoH;
    } catch (e) {
      logger.warn('Failed to embed logo');
    }
  }

  // Association info — right of logo
  page.drawText(ASSOCIATION.name, { x: textX, y: y - 5, size: 11, font: fontBold, color: darkBlue });
  const headerLines = [
    `${ASSOCIATION.address}`,
    `OIB:   ${ASSOCIATION.oib}`,
    `VAT:   ${ASSOCIATION.vat}`,
    `IBAN:  ${ASSOCIATION.iban}`,
    `SWIFT: ${ASSOCIATION.swift}`,
    `email:  ${ASSOCIATION.email}`,
  ];
  let hy = y - 20;
  for (const line of headerLines) {
    page.drawText(line, { x: textX, y: hy, size: 7.5, font: fontRegular, color: gray });
    hy -= 11;
  }

  y = Math.min(hy, logoBottomY) - 5;

  // ─── Client info (left) ─────────────────────────────────────────────
  page.drawText(member.company.name, { x: margin, y, size: 10, font: fontBold, color: black });
  y -= 14;
  if (member.company.address) {
    page.drawText(member.company.address, { x: margin, y, size: 9, font: fontRegular, color: black });
    y -= 12;
  }
  const cityLine = `${member.company.zip || ''} ${member.company.city || ''}`.trim();
  if (cityLine) {
    page.drawText(cityLine, { x: margin, y, size: 9, font: fontRegular, color: black });
    y -= 20;
  }

  page.drawText(`Osobni identifikacijski broj: ${member.company.oib}`, { x: margin, y, size: 8, font: fontRegular, color: gray });

  // ─── PREDRACUN title + document info (right) ────────────────────────
  const boxX = 340;
  const titleY = y + 48;
  page.drawText('PREDRAČUN', { x: boxX, y: titleY, size: 22, font: fontBold, color: darkBlue });

  const infoItems = [
    ['Broj:', offerNumber],
    ['Mjesto:', 'ZAGREB'],
    ['Referenca:', reference],
    ['Datum:', formatDate(now)],
    ['Dospijeće:', formatDate(dueDate)],
  ];
  let iy = titleY - 22;
  for (const [label, value] of infoItems) {
    page.drawText(label, { x: boxX, y: iy, size: 8, font: fontRegular, color: gray });
    page.drawText(value, { x: boxX + 70, y: iy, size: 8, font: fontBold, color: black });
    iy -= 13;
  }

  page.drawText('Osnovica za predračun:', { x: boxX, y: iy, size: 8, font: fontRegular, color: gray });

  // ─── Table header ──────────────────────────────────────────────────
  y -= 60;
  const lineY = y + 2;
  page.drawLine({ start: { x: margin, y: lineY }, end: { x: width - margin, y: lineY }, thickness: 0.5, color: black });

  const cols = [
    { label: 'Vrsta robe odnosno usluga', x: margin, w: 180 },
    { label: 'Količina', x: 240, w: 55 },
    { label: 'Cijena', x: 300, w: 50 },
    { label: 'PDV', x: 355, w: 50 },
    { label: 'Cijena + PDV', x: 410, w: 55 },
    { label: 'Vrijednost EUR', x: 470, w: 75 },
  ];

  for (const col of cols) {
    page.drawText(col.label, { x: col.x, y: y - 10, size: 7, font: fontBold, color: black });
  }

  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: black });

  // ─── Item row ──────────────────────────────────────────────────────
  y -= 15;
  page.drawText('(001) ČLANARINA', { x: margin, y, size: 9, font: fontBold, color: black });
  page.drawText('1,00 kom', { x: 240, y, size: 8, font: fontRegular, color: black });
  page.drawText(formatAmount(amount), { x: 300, y, size: 8, font: fontRegular, color: black });
  page.drawText('0,00 (0 %)', { x: 355, y, size: 8, font: fontRegular, color: black });
  page.drawText(formatAmount(amount), { x: 410, y, size: 8, font: fontRegular, color: black });
  page.drawText(formatAmount(amount), { x: 480, y, size: 8, font: fontBold, color: black });

  y -= 13;
  const descLine = `Godišnja članarina eCommerce Hrvatska - ${tierLabel} (${typeLabel}) (${formatDate(periodStart)}-${formatDate(periodEnd)})`;
  page.drawText(descLine, { x: margin, y, size: 7, font: fontRegular, color: gray });

  // ─── Totals ─────────────────────────────────────────────────────────
  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: black });

  const totals = [
    ['Ukupno:', formatAmount(amount)],
    ['Ukupno EUR:', formatAmount(amount)],
    ['Za plaćanje EUR:', formatAmount(amount)],
  ];
  for (let i = 0; i < totals.length; i++) {
    const ty = y - 15 - i * 15;
    const isLast = i === totals.length - 1;
    page.drawText(totals[i][0], { x: 380, y: ty, size: isLast ? 10 : 8, font: fontBold, color: black });
    page.drawText(totals[i][1], { x: 480, y: ty, size: isLast ? 10 : 8, font: fontBold, color: black });
  }

  // ─── Legal text ─────────────────────────────────────────────────────
  y -= 75;
  const legalLines = [
    'Prema cl. 27.a Zakona o fiskalizaciji u prometu gotovinom (Nar. nov., br. 133/12., 115/16. i 106/18.)',
    '"Ovo nije fiskalizirani račun".',
    'Uplatu izvršite na transakcijski račun otvoren u PBZ d.d.',
    `IBAN: ${ASSOCIATION.iban}`,
  ];
  for (const line of legalLines) {
    page.drawText(line, { x: margin, y, size: 7, font: fontRegular, color: gray });
    y -= 11;
  }

  // ─── Slikaj i plati / payment info ──────────────────────────────────
  y -= 10;
  page.drawText('Slikaj i plati:', { x: 350, y, size: 9, font: fontBold, color: darkBlue });
  const paymentInfo = [
    `Primatelj: ${ASSOCIATION.name}`,
    `IBAN: ${ASSOCIATION.iban}`,
    `Iznos: ${formatAmount(amount)} EUR`,
    `Poziv na broj: ${reference}`,
    `Opis: Članarina ${offerNumber}`,
  ];
  let py = y - 14;
  for (const line of paymentInfo) {
    page.drawText(line, { x: 350, y: py, size: 7, font: fontRegular, color: black });
    py -= 11;
  }

  // ─── HUB-3 PDF417 barcode ──────────────────────────────────────────
  const hub3Amount = String(Math.round(amount * 100)).padStart(15, '0');
  const hub3Data = [
    'HRVHUB30', // header
    'EUR',
    hub3Amount,
    member.company.name.substring(0, 30),
    (member.company.address || '').substring(0, 27),
    `${member.company.zip || ''} ${member.company.city || ''}`.trim().substring(0, 27),
    ASSOCIATION.name,
    'Republike Austrije 9',
    '10000 Zagreb',
    ASSOCIATION.iban.replace(/\s/g, ''),
    'HR00',
    `${now.getFullYear()}${offerNumber}`,
    'OTHR',
    `Članarina ${offerNumber}`,
  ].join('\n');

  try {
    const barcodePng = await bwipjs.toBuffer({
      bcid: 'pdf417',
      text: hub3Data,
      scale: 2,
      height: 15,
      includetext: false,
    });
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    const barcodeScale = Math.min(180 / barcodeImage.width, 80 / barcodeImage.height);
    const barcodeW = barcodeImage.width * barcodeScale;
    const barcodeH = barcodeImage.height * barcodeScale;
    page.drawImage(barcodeImage, {
      x: 350,
      y: py - 15 - barcodeH,
      width: barcodeW,
      height: barcodeH,
    });
  } catch (e) {
    logger.warn({ err: e }, 'Failed to generate PDF417 barcode');
  }

  // ─── Footer ─────────────────────────────────────────────────────────
  const footerY = margin + 10;
  page.drawLine({ start: { x: margin, y: footerY + 5 }, end: { x: width - margin, y: footerY + 5 }, thickness: 0.5, color: gray });
  const footerText = `${ASSOCIATION.name}   MB:${ASSOCIATION.mb}   RNO:${ASSOCIATION.rno}   ${ASSOCIATION.web}`;
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 7);
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: footerY - 5,
    size: 7,
    font: fontRegular,
    color: gray,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─── Offer CRUD ───────────────────────────────────────────────────────────────

export async function createOffer(
  memberId: string,
  step: number,
): Promise<{ offer: any; pdfBuffer: Buffer }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true, company: true },
  });

  if (!member) throw new Error('Član nije pronađen');
  if (member.memberTier === 'FREE') throw new Error('Besplatni članovi ne dobivaju predračun');

  const price = getMembershipPrice(member.memberType, member.memberTier);
  if (price === null || price === 0) throw new Error('Cijena nije dostupna za ovaj tip članstva');

  // For step 2, reuse existing offer (same predračun, just resend)
  if (step >= 2) {
    const existingOffer = await prisma.offer.findFirst({
      where: { memberId, status: 'SENT' },
      orderBy: { createdAt: 'desc' },
      include: { member: { include: { user: true, company: true } } },
    });

    if (existingOffer) {
      // Update the step to 2
      const updated = await prisma.offer.update({
        where: { id: existingOffer.id },
        data: { step: 2, updatedAt: new Date() },
        include: { member: { include: { user: true, company: true } } },
      });
      const pdfBuffer = existingOffer.pdfData
        ? Buffer.from(existingOffer.pdfData)
        : await generateOfferPDF(member, existingOffer.offerNumber, price, 2);
      return { offer: updated, pdfBuffer };
    }
  }

  const offerNumber = await getNextOfferNumber();

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  const periodStart = member.expiresAt && member.expiresAt > now
    ? new Date(member.expiresAt) : now;
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const items = [
    {
      code: '001',
      description: `ČLANARINA - ${TIER_LABELS[member.memberTier]} (${TYPE_LABELS[member.memberType] || member.memberType})`,
      period: `${formatDate(periodStart)}-${formatDate(periodEnd)}`,
      quantity: 1,
      unitPrice: price,
      vatRate: 0,
      total: price,
    },
  ];

  const pdfBuffer = await generateOfferPDF(member, offerNumber, price, step);

  const offer = await prisma.offer.create({
    data: {
      offerNumber,
      memberId,
      amount: price,
      items,
      step,
      validUntil,
      pdfData: new Uint8Array(pdfBuffer),
      updatedAt: now,
    },
    include: { member: { include: { user: true, company: true } } },
  });

  return { offer, pdfBuffer };
}

export async function getOffers(
  page = 1,
  limit = 20,
  status?: string,
  search?: string,
) {
  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { offerNumber: { contains: search } },
      { member: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
      { member: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
      { member: { company: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      include: { member: { include: { user: true, company: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.offer.count({ where }),
  ]);

  const sanitized = offers.map(({ pdfData, ...rest }) => rest);
  return { offers: sanitized, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getOfferPDF(offerId: string): Promise<Buffer | null> {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { pdfData: true },
  });
  return offer?.pdfData ? Buffer.from(offer.pdfData) : null;
}

export async function getMemberOffers(memberId: string) {
  return prisma.offer.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, offerNumber: true, amount: true, currency: true,
      status: true, step: true, validUntil: true, respondedAt: true, createdAt: true,
    },
  });
}

export async function getMemberLastStep(memberId: string): Promise<number> {
  const lastOffer = await prisma.offer.findFirst({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    select: { step: true },
  });
  return lastOffer?.step ?? 0;
}

export async function updateOfferStatus(offerId: string, status: 'ACCEPTED' | 'DECLINED'): Promise<void> {
  await prisma.offer.update({
    where: { id: offerId },
    data: { status, respondedAt: new Date(), updatedAt: new Date() },
  });
}

export async function updateOfferStatusByMember(memberId: string, status: 'ACCEPTED' | 'DECLINED'): Promise<void> {
  const latestOffer = await prisma.offer.findFirst({
    where: { memberId, status: 'SENT' },
    orderBy: { createdAt: 'desc' },
  });
  if (latestOffer) {
    await prisma.offer.update({
      where: { id: latestOffer.id },
      data: { status, respondedAt: new Date(), updatedAt: new Date() },
    });
  }
}
