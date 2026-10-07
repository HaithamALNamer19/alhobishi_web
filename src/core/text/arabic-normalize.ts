/**
 * Arabic text normalization for search.
 * Unifies letter variants so "أدوات" / "ادوات" / "إدوات" match, removes
 * diacritics (tashkeel) and tatweel, lowercases Latin characters.
 */
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

const ARABIC_INDIC_DIGITS = /[\u0660-\u0669]/g;
const PERSIAN_DIGITS = /[\u06F0-\u06F9]/g;

export function normalizeArabic(input: string): string {
  return input
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(ARABIC_INDIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MIN_PREFIX = 2;
const MAX_PREFIX = 15;

/**
 * Builds prefix tokens for Firestore `array-contains` search.
 * "طقم اواني" → ["طق","طقم","او","اوا","اوان","اواني", ...].
 * `exact` values (SKU, barcode, phone) are added as tokens (both spaced and compact).
 */
export function buildSearchKeywords(texts: string[], exact: (string | null | undefined)[] = []): string[] {
  const tokens = new Set<string>();

  for (const text of texts) {
    for (const word of normalizeArabic(text).split(' ')) {
      if (!word) continue;
      const max = Math.min(word.length, MAX_PREFIX);
      for (let i = Math.min(MIN_PREFIX, word.length); i <= max; i++) {
        tokens.add(word.slice(0, i));
      }
    }
  }

  for (const value of exact) {
    if (!value) continue;
    const rawClean = value.trim().toLowerCase();
    tokens.add(rawClean);

    const norm = normalizeArabic(value);
    if (norm) {
      tokens.add(norm);
      const compact = norm.replace(/\s+/g, '');
      if (compact) tokens.add(compact);
    }
  }

  return [...tokens];
}

/** Normalizes a user search query to a single token compatible with buildSearchKeywords. */
export function toSearchToken(query: string): string | null {
  const first = normalizeArabic(query).split(' ')[0] ?? '';
  if (first.length < MIN_PREFIX) return null;
  return first.slice(0, MAX_PREFIX);
}
