export enum UserRole {
  OWNER = 'OWNER',
  OPERATOR = 'OPERATOR',
  MEMBER = 'MEMBER',
  PARTNER = 'PARTNER',
}

export type Permission =
  | 'members:read'
  | 'members:write'
  | 'members:delete'
  | 'payments:read'
  | 'payments:write'
  | 'invoices:read'
  | 'invoices:write'
  | 'audits:read'
  | 'audits:write'
  | 'certifications:read'
  | 'certifications:write'
  | 'certifications:approve'
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'settings:read'
  | 'settings:write'
  | 'reports:read'
  | 'partner:dashboard'
  | 'partner:offers'
  | 'competitors:read'
  | 'competitors:write'
  | 'market_intel:read'
  | 'market_intel:write'
  | 'benchmarks:read'
  | 'benchmarks:write'
  | 'partners:read';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    'members:read',
    'members:write',
    'members:delete',
    'payments:read',
    'payments:write',
    'invoices:read',
    'invoices:write',
    'audits:read',
    'audits:write',
    'certifications:read',
    'certifications:write',
    'certifications:approve',
    'users:read',
    'users:write',
    'users:delete',
    'settings:read',
    'settings:write',
    'reports:read',
    'partner:dashboard',
    'partner:offers',
    'competitors:read',
    'competitors:write',
    'market_intel:read',
    'market_intel:write',
    'benchmarks:read',
    'benchmarks:write',
    'partners:read',
  ],
  [UserRole.OPERATOR]: [
    'members:read',
    'members:write',
    'payments:read',
    'payments:write',
    'invoices:read',
    'invoices:write',
    'audits:read',
    'audits:write',
    'certifications:read',
    'certifications:write',
    'reports:read',
    'competitors:read',
    'competitors:write',
    'market_intel:read',
    'market_intel:write',
    'benchmarks:read',
    'benchmarks:write',
    'partners:read',
  ],
  [UserRole.MEMBER]: [
    'members:read',
    'payments:read',
    'invoices:read',
    'audits:read',
    'certifications:read',
    'certifications:write',
    'competitors:read',
    'market_intel:read',
    'benchmarks:read',
    'partners:read',
  ],
  [UserRole.PARTNER]: [
    'partner:dashboard',
    'partner:offers',
    'members:read',
  ],
};
