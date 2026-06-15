export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  orgId: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
}

export interface Package {
  id: string;
  projectId: string;
  name: string;
  description: string;
  currency: string;
  currentStage: string | null;
  awardValue: number;
}

export interface DashboardData {
  name: string;
  currency: string;
  currentStage: string | null;
  awardValue: number;
  billedTotal: number;
  inflowTotal: number;
  outflowTotal: number;
  balance: number;
  milestoneProgress: number;
}

// Roles allowed to write. Anyone else (e.g. 'viewer') is read-only.
export const canWrite = (role?: string) => ['owner', 'admin', 'editor'].includes(role ?? '');

export const MILESTONE_NAMES = [
  'Mobilisation',
  'Preliminaries',
  'Procurement',
  'Installation',
  'Testing and Commissioning',
  'Handover',
] as const;

export type MilestoneName = (typeof MILESTONE_NAMES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  EUR: '€',
  JPY: '¥',
  AED: 'د.إ',
  SGD: 'S$',
};

export function formatAmount(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  if (currency === 'INR') {
    if (amount >= 10_000_000) return `${sym}${(amount / 10_000_000).toFixed(2)} Cr`;
    if (amount >= 100_000)    return `${sym}${(amount / 100_000).toFixed(2)} L`;
  }
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
