/**
 * Import/refresh member data from the Google Sheet export (_sheet.json).
 * Matches a sheet row to a DB Company by OIB, then by normalized name.
 * Fills: company (email/phone/address), 1st member (User name/email + personal
 * OIB/DOB/mobile), 2nd member (SecondaryContact).
 *
 * DRY RUN: pnpm exec tsx --env-file=../../.env src/import-sheet.ts
 * APPLY:   APPLY=1 pnpm exec tsx --env-file=../../.env src/import-sheet.ts
 */
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === '1';

interface Person { first: string; last: string; email: string; mob: string; oib: string; dob: string }
interface Rec {
  note: string; company: string; cEmail: string; cPhone: string; cOib: string; cAddr: string;
  m1: Person; m2: Person;
}

const recs: Rec[] = JSON.parse(readFileSync(new URL('./_sheet.json', import.meta.url), 'utf8'));

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const nn = (s: string) => { const v = (s || '').trim(); return v === '' ? undefined : v; };
const digits = (s: string) => (s || '').replace(/\D/g, '');

function parseDob(s: string): Date | undefined {
  const v = (s || '').trim().replace(/\.$/, '');
  if (!v) return undefined;
  const m = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(dt.getTime()) ? undefined : dt;
}

async function main() {
  console.log(`\n=== Import sheet — ${APPLY ? 'APPLY' : 'DRY RUN'} === (${recs.length} rows)\n`);

  const companies = await prisma.company.findMany({
    include: {
      members: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, secondaryContact: true },
      },
    },
  });
  const byOib = new Map<string, typeof companies[number]>();
  const byName = new Map<string, typeof companies[number]>();
  for (const c of companies) { byOib.set(digits(c.oib), c); byName.set(norm(c.name), c); }

  // all emails currently in use → for collision checks
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const emailOwner = new Map<string, string>();
  for (const u of allUsers) emailOwner.set(u.email.toLowerCase(), u.id);

  let matchedOib = 0, matchedName = 0, unmatched: string[] = [];
  let userUpdates = 0, memberUpdates = 0, companyUpdates = 0, scUpserts = 0;
  const emailConflicts: string[] = [];
  const multiMember: string[] = [];

  const plannedOps: (() => Promise<unknown>)[] = [];

  for (const r of recs) {
    let c = (r.cOib && byOib.get(digits(r.cOib))) || byName.get(norm(r.company));
    if (!c) { unmatched.push(`${r.company} (OIB ${r.cOib || '—'})`); continue; }
    if (r.cOib && byOib.get(digits(r.cOib))) matchedOib++; else matchedName++;

    if (c.members.length !== 1) { multiMember.push(`${c.name} (${c.members.length} članova)`); }
    const member = c.members[0];
    if (!member) continue;

    // --- 1st member → User ---
    const ud: Record<string, string> = {};
    if (nn(r.m1.first)) ud.firstName = r.m1.first.trim();
    if (nn(r.m1.last)) ud.lastName = r.m1.last.trim();
    if (nn(r.m1.email)) {
      const e = r.m1.email.trim();
      const owner = emailOwner.get(e.toLowerCase());
      if (owner && owner !== member.user.id) {
        emailConflicts.push(`${c.name}: ${e} već koristi drugi korisnik — email preskočen`);
      } else {
        ud.email = e;
      }
    }
    if (Object.keys(ud).length) {
      userUpdates++;
      plannedOps.push(() => prisma.user.update({ where: { id: member.user.id }, data: ud }));
    }

    // --- 1st member personal → Member ---
    const md: Record<string, unknown> = {};
    if (nn(r.m1.oib)) md.personalOib = r.m1.oib.trim();
    if (nn(r.m1.mob)) md.personalPhone = r.m1.mob.trim();
    const dob = parseDob(r.m1.dob);
    if (dob) md.dateOfBirth = dob;
    if (Object.keys(md).length) {
      memberUpdates++;
      plannedOps.push(() => prisma.member.update({ where: { id: member.id }, data: md }));
    }

    // --- Company ---
    const cd: Record<string, string> = {};
    if (nn(r.cEmail)) cd.email = r.cEmail.trim();
    if (nn(r.cPhone)) cd.phone = r.cPhone.trim();
    if (nn(r.cAddr)) cd.address = r.cAddr.trim();
    if (Object.keys(cd).length) {
      companyUpdates++;
      plannedOps.push(() => prisma.company.update({ where: { id: c.id }, data: cd }));
    }

    // --- 2nd member → SecondaryContact (upsert) ---
    if (nn(r.m2.first) || nn(r.m2.last) || nn(r.m2.email)) {
      const scData = {
        firstName: nn(r.m2.first), lastName: nn(r.m2.last), email: nn(r.m2.email),
        phone: nn(r.m2.mob), oib: nn(r.m2.oib), dateOfBirth: parseDob(r.m2.dob) ?? null,
      };
      scUpserts++;
      plannedOps.push(() => prisma.secondaryContact.upsert({
        where: { memberId: member.id },
        create: { memberId: member.id, ...scData },
        update: scData,
      }));
    }
  }

  console.log(`Matched by OIB: ${matchedOib}, by name: ${matchedName}, UNMATCHED: ${unmatched.length}`);
  console.log(`Planned: user=${userUpdates}, member personal=${memberUpdates}, company=${companyUpdates}, 2nd-contact=${scUpserts}`);
  if (multiMember.length) { console.log(`\n⚠ companies still with !=1 member (${multiMember.length}):`); multiMember.forEach((m) => console.log('   ' + m)); }
  if (emailConflicts.length) { console.log(`\n⚠ email conflicts (${emailConflicts.length}):`); emailConflicts.forEach((m) => console.log('   ' + m)); }
  if (unmatched.length) { console.log(`\n✗ UNMATCHED rows (${unmatched.length}):`); unmatched.forEach((m) => console.log('   ' + m)); }

  if (!APPLY) { console.log('\n(DRY RUN — nothing written. Re-run with APPLY=1.)'); return; }

  let done = 0;
  for (const op of plannedOps) { await op(); done++; }
  console.log(`\n✓ Applied ${done} operations.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
