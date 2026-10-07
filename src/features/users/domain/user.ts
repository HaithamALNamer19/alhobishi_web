import type { Role } from '@/core/auth/roles';

export const UserStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** Account summary maintained ONLY inside ledger transactions (phase 6). */
export interface AccountSummary {
  balance: number;
  totalDebit: number;
  totalCredit: number;
  lastSeq: number;
  lastTransactionAt: Date | null;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  phone: string;
  role: Role;
  status: UserStatus;
  account: AccountSummary;
  stats: { ordersCount: number; openOrdersCount: number };
  wholesaleSince: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const emptyAccount = (): AccountSummary => ({
  balance: 0,
  totalDebit: 0,
  totalCredit: 0,
  lastSeq: 0,
  lastTransactionAt: null,
});

