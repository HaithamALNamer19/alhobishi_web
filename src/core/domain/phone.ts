/**
 * Yemeni mobile numbers: 9 digits starting with 7 (70, 71, 73, 77, 78).
 * Accepts: 77xxxxxxx · 077xxxxxxx · +96777xxxxxxx · 0096777xxxxxxx.
 * Stored in E.164: +9677xxxxxxxx.
 */
const LOCAL_MOBILE = /^7[01378]\d{7}$/;

export function normalizeYemeniPhone(input: string): string | null {
  const digits = input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\d+]/g, '');

  let local = digits;
  if (local.startsWith('+967')) local = local.slice(4);
  else if (local.startsWith('00967')) local = local.slice(5);
  else if (local.startsWith('967') && local.length === 12) local = local.slice(3);
  else if (local.startsWith('0')) local = local.slice(1);

  return LOCAL_MOBILE.test(local) ? `+967${local}` : null;
}

/** "+967771234567" → "771 234 567" for display. */
export function formatYemeniPhone(e164: string): string {
  const local = e164.replace(/^\+967/, '');
  return local.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
}

