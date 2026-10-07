/**
 * Simple Arabic number-to-words converter (Tafqeet) for Yemeni Riyal currency amounts.
 */
const ones = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const tens = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const hundreds = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertBelowThousand(n: number): string {
  if (n === 0) return '';
  const parts: string[] = [];

  const h = Math.floor(n / 100);
  const remainder = n % 100;

  if (h > 0) {
    parts.push(hundreds[h]);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ones[remainder]);
    } else {
      const o = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (o > 0) {
        parts.push(`${ones[o]} و${tens[t]}`);
      } else {
        parts.push(tens[t]);
      }
    }
  }

  return parts.join(' و');
}

export function tafqeetRials(amount: number): string {
  const num = Math.round(Math.abs(amount));
  if (num === 0) return 'صفر ريال يمني';

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  const sections: string[] = [];

  if (millions > 0) {
    if (millions === 1) {
      sections.push('مليون');
    } else if (millions === 2) {
      sections.push('مليونان');
    } else if (millions >= 3 && millions <= 10) {
      sections.push(`${convertBelowThousand(millions)} ملايين`);
    } else {
      sections.push(`${convertBelowThousand(millions)} مليون`);
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      sections.push('ألف');
    } else if (thousands === 2) {
      sections.push('ألفان');
    } else if (thousands >= 3 && thousands <= 10) {
      sections.push(`${convertBelowThousand(thousands)} آلاف`);
    } else {
      sections.push(`${convertBelowThousand(thousands)} ألف`);
    }
  }

  if (remainder > 0) {
    sections.push(convertBelowThousand(remainder));
  }

  return `فقط وقدره ${sections.join(' و')} ريال يمني لا غير`;
}

