import type { MemberType, MemberTier } from '@ecommerce-hr/db';

/**
 * Membership pricing in EUR by type × tier.
 * null = combination not available (e.g. PHYSICAL + PREMIUM).
 */
export const MEMBERSHIP_PRICING: Record<MemberType, Record<MemberTier, number | null>> = {
  WEB_TRADER: { FREE: 0, STANDARD: 300, PREMIUM: 2000 },
  SERVICE_PROVIDER: { FREE: 0, STANDARD: 400, PREMIUM: 1500 },
  PHYSICAL: { FREE: 0, STANDARD: 250, PREMIUM: null },
};

export const MEMBERSHIP_BENEFITS: Record<MemberType, Record<MemberTier, string[]>> = {
  WEB_TRADER: {
    FREE: ['Pristup member zoni', 'Osnovni market intelligence'],
    STANDARD: [
      'Pristup member zoni',
      'Market intelligence feed',
      'Benchmark podaci',
      'Partner popusti',
      'Safe Shop certifikacija',
    ],
    PREMIUM: [
      'Pristup member zoni',
      'Market intelligence feed',
      'Benchmark podaci',
      'Partner popusti',
      'Safe Shop certifikacija',
      'AI competitor scan',
      'Prioritetna podrška',
      'Academy pristup',
      'Dedicirani account manager',
    ],
  },
  SERVICE_PROVIDER: {
    FREE: ['Pristup member zoni', 'Osnovni market intelligence'],
    STANDARD: [
      'Pristup member zoni',
      'Market intelligence feed',
      'Benchmark podaci',
      'Partner popusti',
    ],
    PREMIUM: [
      'Pristup member zoni',
      'Market intelligence feed',
      'Benchmark podaci',
      'Partner popusti',
      'AI competitor scan',
      'Prioritetna podrška',
      'Academy pristup',
    ],
  },
  PHYSICAL: {
    FREE: ['Pristup member zoni'],
    STANDARD: [
      'Pristup member zoni',
      'Market intelligence feed',
      'Partner popusti',
    ],
    PREMIUM: [], // not available
  },
};

export const TIER_LABELS: Record<MemberTier, string> = {
  FREE: 'Besplatno',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

export function getMembershipPrice(type: MemberType, tier: MemberTier): number | null {
  return MEMBERSHIP_PRICING[type]?.[tier] ?? null;
}

export function getMembershipBenefits(type: MemberType, tier: MemberTier): string[] {
  return MEMBERSHIP_BENEFITS[type]?.[tier] ?? [];
}

export function isTierAvailable(type: MemberType, tier: MemberTier): boolean {
  return MEMBERSHIP_PRICING[type]?.[tier] !== null;
}
