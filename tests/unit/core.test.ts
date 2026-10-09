import { describe, it, expect } from 'vitest';
import { assertMoney, addMoney, multiplyMoney, formatMoney, isValidMoney } from '@/core/domain/money';
import { toBusinessDate, businessYear, STORE_TIME_ZONE } from '@/core/domain/dates';
import { normalizeArabic, buildSearchKeywords, toSearchToken } from '@/core/text/arabic-normalize';
import { normalizeUsername, isValidUsername, usernameToEmail, emailToUsername } from '@/features/auth/domain/username';
import { normalizeYemeniPhone, formatYemeniPhone } from '@/core/domain/phone';
import { can, Role, Permission, isBackOfficeRole, parseRole } from '@/core/auth/roles';
import { ErrorCode } from '@/core/errors/error-codes';
import { errorMessagesAr } from '@/core/errors/messages.ar';

describe('Money Domain (YER)', () => {
  it('validates safe integer money without fractions', () => {
    expect(isValidMoney(5000)).toBe(true);
    expect(isValidMoney(0)).toBe(true);
    expect(isValidMoney(-1500)).toBe(true);
    expect(isValidMoney(50.5)).toBe(false);
  });

  it('adds and multiplies money safely', () => {
    const a = assertMoney(25000);
    const b = assertMoney(50000);
    expect(addMoney(a, b)).toBe(75000);
    expect(multiplyMoney(a, 3)).toBe(75000);
  });

  it('formats YER currency with symbol and latin numerals', () => {
    const formatted = formatMoney(assertMoney(75000));
    expect(formatted).toContain('75,000');
    expect(formatted).toContain('ر.ي');
  });
});

describe('Dates Domain (Asia/Aden)', () => {
  it('returns ISO date YYYY-MM-DD for business date', () => {
    const dateStr = toBusinessDate(new Date('2026-10-06T20:00:00Z'));
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(businessYear(new Date('2026-10-06T20:00:00Z'))).toBe(2026);
  });
});

describe('Arabic Normalization & Search Keywords', () => {
  it('normalizes arabic letter variations and removes diacritics', () => {
    expect(normalizeArabic('أَدَوَاتٌ مَنْزِلِيَّة')).toBe('ادوات منزليه');
    expect(normalizeArabic('إكسسوارات')).toBe('اكسسوارات');
    expect(normalizeArabic('شاي كيني فـاخـر')).toBe('شاي كيني فاخر');
  });

  it('normalizes Arabic-Indic digits to Latin digits', () => {
    expect(normalizeArabic('سعر ٥٠٠٠ ريال')).toBe('سعر 5000 ريال');
  });

  it('generates prefix search tokens for Firestore array-contains', () => {
    const tokens = buildSearchKeywords(['طقم اواني'], ['SKU-100']);
    expect(tokens).toContain('طق');
    expect(tokens).toContain('طقم');
    expect(tokens).toContain('او');
    expect(tokens).toContain('اواني');
    expect(tokens).toContain('sku-100');
  });

  it('generates single query token from user input', () => {
    expect(toSearchToken('أواني منزلية')).toBe('اواني');
    expect(toSearchToken('أ')).toBeNull();
  });
});

describe('Username Domain', () => {
  it('validates correct username patterns', () => {
    expect(isValidUsername('ahmed_99')).toBe(true);
    expect(isValidUsername('store123')).toBe(true);
    expect(isValidUsername('ali')).toBe(true);

    expect(isValidUsername('123abc')).toBe(false); // starts with digit
    expect(isValidUsername('al')).toBe(false); // too short
    expect(isValidUsername('ahmed__ali')).toBe(false); // double underscore
    expect(isValidUsername('user_name_')).toBe(false); // ends with underscore
    expect(isValidUsername('ahmed ali')).toBe(false); // contains space
  });

  it('maps between username and internal email', () => {
    expect(usernameToEmail('ahmed_99')).toBe('ahmed_99@users.matjar.internal');
    expect(emailToUsername('ahmed_99@users.matjar.internal')).toBe('ahmed_99');
    expect(emailToUsername('external@gmail.com')).toBeNull();
  });
});

describe('Yemeni Phone Domain', () => {
  it('normalizes local Yemeni numbers to E.164', () => {
    expect(normalizeYemeniPhone('771234567')).toBe('+967771234567');
    expect(normalizeYemeniPhone('0771234567')).toBe('+967771234567');
    expect(normalizeYemeniPhone('+967771234567')).toBe('+967771234567');
    expect(normalizeYemeniPhone('00967731234567')).toBe('+967731234567');
    expect(normalizeYemeniPhone('712345678')).toBe('+967712345678');
  });

  it('rejects invalid numbers', () => {
    expect(normalizeYemeniPhone('123456789')).toBeNull();
    expect(normalizeYemeniPhone('771234')).toBeNull();
  });

  it('formats Yemeni phone for clean display', () => {
    expect(formatYemeniPhone('+967771234567')).toBe('771 234 567');
  });
});

describe('Roles & Permissions', () => {
  it('verifies wholesale permissions', () => {
    expect(can(Role.CUSTOMER, Permission.PRICES_VIEW_WHOLESALE)).toBe(false);
    expect(can(Role.WHOLESALE, Permission.PRICES_VIEW_WHOLESALE)).toBe(true);
    expect(can(Role.ADMIN, Permission.PRICES_VIEW_WHOLESALE)).toBe(true);
  });

  it('verifies staff vs admin permissions', () => {
    expect(isBackOfficeRole(Role.STAFF)).toBe(true);
    expect(isBackOfficeRole(Role.ADMIN)).toBe(true);
    expect(isBackOfficeRole(Role.CUSTOMER)).toBe(false);

    expect(can(Role.STAFF, Permission.ORDERS_PREPARE)).toBe(true);
    expect(can(Role.STAFF, Permission.ORDERS_CONFIRM)).toBe(false); // Staff cannot confirm invoice / create debt
    expect(can(Role.ADMIN, Permission.ORDERS_CONFIRM)).toBe(true);

    expect(can(Role.STAFF, Permission.PAYMENTS_RECORD)).toBe(false); // Staff cannot record payments
    expect(can(Role.ADMIN, Permission.PAYMENTS_RECORD)).toBe(true);
  });

  it('defaults unknown role to customer', () => {
    expect(parseRole('unknown_role')).toBe(Role.CUSTOMER);
  });
});

describe('Account Status & Disabled User Protection', () => {
  it('has dedicated error code and Arabic message for disabled accounts', () => {
    expect(ErrorCode.ACCOUNT_DISABLED).toBe('ACCOUNT_DISABLED');
    expect(errorMessagesAr[ErrorCode.ACCOUNT_DISABLED]).toBe('هذا الحساب معطّل. تواصل مع إدارة المتجر.');
  });
});

