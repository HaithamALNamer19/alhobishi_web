/** Store timezone: all "today" calculations (today's orders, daily sales) use it. */
export const STORE_TIME_ZONE = 'Asia/Aden';

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Returns the business date "YYYY-MM-DD" in the store timezone. */
export function toBusinessDate(date: Date = new Date()): string {
  return businessDateFormatter.format(date);
}

/** Year in the store timezone (used for invoice number sequences). */
export function businessYear(date: Date = new Date()): number {
  return Number(toBusinessDate(date).slice(0, 4));
}

const dateTimeFormatter = new Intl.DateTimeFormat('ar-YE-u-nu-latn', {
  timeZone: STORE_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('ar-YE-u-nu-latn', {
  timeZone: STORE_TIME_ZONE,
  dateStyle: 'medium',
});

export function formatDateTime(date: Date | number): string {
  return dateTimeFormatter.format(date);
}

export function formatDate(date: Date | number): string {
  return dateFormatter.format(date);
}

