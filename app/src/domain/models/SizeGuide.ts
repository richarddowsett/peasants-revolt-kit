import { GenderFit, SizeGuideRow } from './Product';

export interface SizeGuideMeasurement {
  size: string;
  gender?: GenderFit;
  chestCm: string;
  chestIn: string;
  waistCm: string;
  waistIn: string;
  lengthCm?: string;
  lengthIn?: string;
}

export interface SizeGuideTemplate {
  id: string;
  name: string;
  description: string;
  measurements: SizeGuideMeasurement[];
}

export interface SizingPreset {
  id: string;
  name: string;
  description: string;
  rows: SizeGuideRow[];
}

export const SIZING_PRESETS: SizingPreset[] = [
  {
    id: 'vest_gendered',
    name: "Running Vest (Men's & Women's)",
    description: "Athletic race vest with separate Men's (S–XXL) and Women's (XS–XL) sizing.",
    rows: [
      // Men's
      { gender: 'men', size: 'S',   chest: '90 – 95', waist: '76 – 81', length: '67' },
      { gender: 'men', size: 'M',   chest: '96 – 101', waist: '82 – 87', length: '69' },
      { gender: 'men', size: 'L',   chest: '102 – 107', waist: '88 – 93', length: '71' },
      { gender: 'men', size: 'XL',  chest: '108 – 113', waist: '94 – 99', length: '73' },
      { gender: 'men', size: 'XXL', chest: '114 – 119', waist: '100 – 105', length: '75' },
      // Women's
      { gender: 'women', size: 'XS', chest: '80 – 84', waist: '64 – 68', length: '61' },
      { gender: 'women', size: 'S',  chest: '85 – 89', waist: '69 – 73', length: '63' },
      { gender: 'women', size: 'M',  chest: '90 – 94', waist: '74 – 78', length: '65' },
      { gender: 'women', size: 'L',  chest: '95 – 99', waist: '79 – 83', length: '67' },
      { gender: 'women', size: 'XL', chest: '100 – 105', waist: '84 – 89', length: '69' },
    ],
  },
  {
    id: 'tshirt_gendered',
    name: "Technical T-Shirt (Men's & Women's)",
    description: "Club training tee with ergonomic fit for Men (S–XXL) and Women (XS–XL).",
    rows: [
      // Men's
      { gender: 'men', size: 'S',   chest: '92 – 97', waist: '78 – 83', length: '68' },
      { gender: 'men', size: 'M',   chest: '98 – 103', waist: '84 – 89', length: '70' },
      { gender: 'men', size: 'L',   chest: '104 – 109', waist: '90 – 95', length: '72' },
      { gender: 'men', size: 'XL',  chest: '110 – 115', waist: '96 – 101', length: '74' },
      { gender: 'men', size: 'XXL', chest: '116 – 121', waist: '102 – 107', length: '76' },
      // Women's
      { gender: 'women', size: 'XS', chest: '82 – 86', waist: '65 – 70', length: '62' },
      { gender: 'women', size: 'S',  chest: '87 – 91', waist: '71 – 76', length: '64' },
      { gender: 'women', size: 'M',  chest: '92 – 97', waist: '77 – 82', length: '66' },
      { gender: 'women', size: 'L',  chest: '98 – 103', waist: '83 – 88', length: '68' },
      { gender: 'women', size: 'XL', chest: '104 – 109', waist: '89 – 94', length: '70' },
    ],
  },
  {
    id: 'shorts_gendered',
    name: "Running Shorts (Men's & Women's)",
    description: "Lightweight split shorts with elastic waist and tailored inseams.",
    rows: [
      // Men's
      { gender: 'men', size: 'S',   chest: 'N/A', waist: '76 – 81', length: '13 (Inseam)' },
      { gender: 'men', size: 'M',   chest: 'N/A', waist: '82 – 87', length: '13 (Inseam)' },
      { gender: 'men', size: 'L',   chest: 'N/A', waist: '88 – 93', length: '14 (Inseam)' },
      { gender: 'men', size: 'XL',  chest: 'N/A', waist: '94 – 99', length: '14 (Inseam)' },
      { gender: 'men', size: 'XXL', chest: 'N/A', waist: '100 – 105', length: '15 (Inseam)' },
      // Women's
      { gender: 'women', size: 'XS', chest: 'N/A', waist: '64 – 68', length: '10 (Inseam)' },
      { gender: 'women', size: 'S',  chest: 'N/A', waist: '69 – 73', length: '10 (Inseam)' },
      { gender: 'women', size: 'M',  chest: 'N/A', waist: '74 – 78', length: '11 (Inseam)' },
      { gender: 'women', size: 'L',  chest: 'N/A', waist: '79 – 83', length: '11 (Inseam)' },
      { gender: 'women', size: 'XL', chest: 'N/A', waist: '84 – 89', length: '12 (Inseam)' },
    ],
  },
  {
    id: 'hoodie_unisex',
    name: 'Club Hoodie / Outerwear (Unisex)',
    description: 'Relaxed fit cotton blend hoodie (XS–XXL).',
    rows: [
      { gender: 'unisex', size: 'XS', chest: '88 – 93', waist: '74 – 79', length: '68' },
      { gender: 'unisex', size: 'S',  chest: '94 – 99', waist: '80 – 85', length: '70' },
      { gender: 'unisex', size: 'M',  chest: '100 – 105', waist: '86 – 91', length: '72' },
      { gender: 'unisex', size: 'L',  chest: '106 – 111', waist: '92 – 97', length: '74' },
      { gender: 'unisex', size: 'XL', chest: '112 – 117', waist: '98 – 103', length: '76' },
      { gender: 'unisex', size: 'XXL', chest: '118 – 123', waist: '104 – 109', length: '78' },
    ],
  },
];

export const SIZE_GUIDE_TEMPLATES: Record<string, SizeGuideTemplate> = {
  unisex_vest: {
    id: 'unisex_vest',
    name: 'PRRC Unisex Running Vest',
    description: 'Lightweight, breathable athletic fit vest. Designed for peak race day performance.',
    measurements: [
      { size: 'XS', chestCm: '84 – 89', chestIn: '33 – 35', waistCm: '70 – 75', waistIn: '27 – 29', lengthCm: '65', lengthIn: '25.5' },
      { size: 'S',  chestCm: '90 – 95', chestIn: '35 – 37', waistCm: '76 – 81', waistIn: '30 – 32', lengthCm: '67', lengthIn: '26.4' },
      { size: 'M',  chestCm: '96 – 101', chestIn: '38 – 40', waistCm: '82 – 87', waistIn: '32 – 34', lengthCm: '69', lengthIn: '27.2' },
      { size: 'L',  chestCm: '102 – 107', chestIn: '40 – 42', waistCm: '88 – 93', waistIn: '34 – 36', lengthCm: '71', lengthIn: '28.0' },
      { size: 'XL', chestCm: '108 – 113', chestIn: '43 – 45', waistCm: '94 – 99', waistIn: '37 – 39', lengthCm: '73', lengthIn: '28.7' },
      { size: 'XXL', chestCm: '114 – 119', chestIn: '45 – 47', waistCm: '100 – 105', waistIn: '39 – 41', lengthCm: '75', lengthIn: '29.5' },
    ],
  },
  tshirt: {
    id: 'tshirt',
    name: 'PRRC Technical T-Shirt',
    description: 'Moisture-wicking club training tee with ergonomic side seams.',
    measurements: [
      { size: 'XS', chestCm: '86 – 91', chestIn: '34 – 36', waistCm: '72 – 77', waistIn: '28 – 30', lengthCm: '66', lengthIn: '26.0' },
      { size: 'S',  chestCm: '92 – 97', chestIn: '36 – 38', waistCm: '78 – 83', waistIn: '30 – 32', lengthCm: '68', lengthIn: '26.8' },
      { size: 'M',  chestCm: '98 – 103', chestIn: '38 – 40', waistCm: '84 – 89', waistIn: '33 – 35', lengthCm: '70', lengthIn: '27.6' },
      { size: 'L',  chestCm: '104 – 109', chestIn: '41 – 43', waistCm: '90 – 95', waistIn: '35 – 37', lengthCm: '72', lengthIn: '28.3' },
      { size: 'XL', chestCm: '110 – 115', chestIn: '43 – 45', waistCm: '96 – 101', waistIn: '38 – 40', lengthCm: '74', lengthIn: '29.1' },
      { size: 'XXL', chestCm: '116 – 121', chestIn: '46 – 48', waistCm: '102 – 107', waistIn: '40 – 42', lengthCm: '76', lengthIn: '29.9' },
    ],
  },
  shorts: {
    id: 'shorts',
    name: 'PRRC Running Shorts',
    description: 'Lightweight split shorts with elastic drawcord waist and zip key pocket.',
    measurements: [
      { size: 'XS', chestCm: 'N/A', chestIn: 'N/A', waistCm: '70 – 75', waistIn: '27 – 29', lengthCm: '12 (Inseam)', lengthIn: '4.7 (Inseam)' },
      { size: 'S',  chestCm: 'N/A', chestIn: 'N/A', waistCm: '76 – 81', waistIn: '30 – 32', lengthCm: '13 (Inseam)', lengthIn: '5.1 (Inseam)' },
      { size: 'M',  chestCm: 'N/A', chestIn: 'N/A', waistCm: '82 – 87', waistIn: '32 – 34', lengthCm: '13 (Inseam)', lengthIn: '5.1 (Inseam)' },
      { size: 'L',  chestCm: 'N/A', chestIn: 'N/A', waistCm: '88 – 93', waistIn: '34 – 36', lengthCm: '14 (Inseam)', lengthIn: '5.5 (Inseam)' },
      { size: 'XL', chestCm: 'N/A', chestIn: 'N/A', waistCm: '94 – 99', waistIn: '37 – 39', lengthCm: '14 (Inseam)', lengthIn: '5.5 (Inseam)' },
      { size: 'XXL', chestCm: 'N/A', chestIn: 'N/A', waistCm: '100 – 105', waistIn: '39 – 41', lengthCm: '15 (Inseam)', lengthIn: '5.9 (Inseam)' },
    ],
  },
  hoodie: {
    id: 'hoodie',
    name: 'PRRC Hoodie / Outerwear',
    description: 'Warm, relaxed-fit cotton blend post-race hoodie.',
    measurements: [
      { size: 'XS', chestCm: '88 – 93', chestIn: '35 – 37', waistCm: '74 – 79', waistIn: '29 – 31', lengthCm: '68', lengthIn: '26.8' },
      { size: 'S',  chestCm: '94 – 99', chestIn: '37 – 39', waistCm: '80 – 85', waistIn: '31 – 33', lengthCm: '70', lengthIn: '27.6' },
      { size: 'M',  chestCm: '100 – 105', chestIn: '39 – 41', waistCm: '86 – 91', waistIn: '34 – 36', lengthCm: '72', lengthIn: '28.3' },
      { size: 'L',  chestCm: '106 – 111', chestIn: '42 – 44', waistCm: '92 – 97', waistIn: '36 – 38', lengthCm: '74', lengthIn: '29.1' },
      { size: 'XL', chestCm: '112 – 117', chestIn: '44 – 46', waistCm: '98 – 103', waistIn: '38 – 40', lengthCm: '76', lengthIn: '29.9' },
      { size: 'XXL', chestCm: '118 – 123', chestIn: '46 – 48', waistCm: '104 – 109', waistIn: '41 – 43', lengthCm: '78', lengthIn: '30.7' },
    ],
  },
};

/**
 * Converts a measurement string in centimeters (e.g. "90 – 95", "67 cm", "12 (Inseam)")
 * to inches (1 inch = 2.54 cm), rounded to 1 decimal place.
 */
export function convertCmToInches(value: string): string {
  if (!value || value.trim() === '' || value.toUpperCase() === 'N/A' || value === '—') {
    return value || '—';
  }

  // Remove standalone or trailing "cm"
  const stripped = value.replace(/\s*cm\b/gi, '');

  // Convert each number in the string (integers or decimals)
  return stripped.replace(/(\d+(?:\.\d+)?)/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    const inVal = Math.round((num / 2.54) * 10) / 10;
    return inVal.toString();
  }).trim();
}

/**
 * Formats a measurement string according to the requested unit ('cm' or 'in').
 * When unit is 'cm', displays the value entered by admin (stripping redundant 'cm' text).
 * When unit is 'in', converts centimeters to inches.
 */
export function formatSizeMeasurement(value: string | undefined, unit: 'cm' | 'in'): string {
  if (!value || value.trim() === '') return '—';
  if (value.toUpperCase() === 'N/A' || value === '—') return value;
  if (unit === 'cm') {
    return value.replace(/\s*cm\b/gi, '').trim();
  }
  return convertCmToInches(value);
}

/**
 * Formats a size string with its gender prefix if applicable.
 * e.g. ("M", "men") -> "Men's M", ("S", "women") -> "Women's S", ("L", "unisex") -> "L"
 */
export function formatFullSizeLabel(size: string, gender?: GenderFit): string {
  const trimmed = size.trim();
  const lower = trimmed.toLowerCase();
  if (gender === 'men') {
    if (lower.startsWith("men's ") || lower.startsWith('mens ')) {
      const raw = trimmed.replace(/^(men's|mens)\s+/i, '').trim().toUpperCase();
      return `Men's ${raw}`;
    }
    return `Men's ${trimmed.toUpperCase()}`;
  }
  if (gender === 'women') {
    if (lower.startsWith("women's ") || lower.startsWith('womens ')) {
      const raw = trimmed.replace(/^(women's|womens)\s+/i, '').trim().toUpperCase();
      return `Women's ${raw}`;
    }
    return `Women's ${trimmed.toUpperCase()}`;
  }
  return trimmed.toUpperCase();
}

/**
 * Parses gender and the base size from a size string.
 * e.g. "Men's M" -> { gender: 'men', rawSize: 'M' }
 *      "Women's S" -> { gender: 'women', rawSize: 'S' }
 *      "M" -> { gender: 'unisex', rawSize: 'M' }
 */
export function parseGenderFromSize(sizeString: string): { gender: GenderFit; rawSize: string } {
  const trimmed = sizeString.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("men's ") || lower.startsWith('mens ')) {
    return { gender: 'men', rawSize: trimmed.replace(/^(men's|mens)\s+/i, '').trim().toUpperCase() };
  }
  if (lower.startsWith("women's ") || lower.startsWith('womens ')) {
    return { gender: 'women', rawSize: trimmed.replace(/^(women's|womens)\s+/i, '').trim().toUpperCase() };
  }
  return { gender: 'unisex', rawSize: trimmed.toUpperCase() };
}

/**
 * Returns the distinct genders present in size guide rows or size strings.
 */
export function getAvailableGenders(rows: SizeGuideRow[] = [], sizes: string[] = []): GenderFit[] {
  const found = new Set<GenderFit>();

  for (const row of rows) {
    if (row.gender) found.add(row.gender);
  }

  for (const s of sizes) {
    const { gender } = parseGenderFromSize(s);
    if (gender !== 'unisex') found.add(gender);
  }

  const result: GenderFit[] = [];
  if (found.has('men')) result.push('men');
  if (found.has('women')) result.push('women');
  if (found.has('unisex') || result.length === 0) result.push('unisex');
  return result;
}

/**
 * Categorizes a product's sizes into men's, women's, and unisex sets with label and fullSize.
 */
export interface CategorizedSizeItem {
  rawSize: string;   // e.g. "M"
  fullSize: string;  // e.g. "Men's M"
  gender: GenderFit; // 'men' | 'women' | 'unisex'
}

export function categorizeProductSizes(
  sizes: string[] = [],
  rows: SizeGuideRow[] = []
): {
  men: CategorizedSizeItem[];
  women: CategorizedSizeItem[];
  unisex: CategorizedSizeItem[];
  hasGenderSplit: boolean;
} {
  const men: CategorizedSizeItem[] = [];
  const women: CategorizedSizeItem[] = [];
  const unisex: CategorizedSizeItem[] = [];
  const seenMen = new Set<string>();
  const seenWomen = new Set<string>();
  const seenUnisex = new Set<string>();

  // If rows define sizes and genders, rows are the primary source of truth
  if (rows && rows.length > 0) {
    for (const r of rows) {
      if (!r.size || !r.size.trim()) continue;
      const g = r.gender || 'unisex';
      const raw = r.size.trim().toUpperCase();
      const full = formatFullSizeLabel(raw, g);
      const item: CategorizedSizeItem = { rawSize: raw, fullSize: full, gender: g };
      if (g === 'men' && !seenMen.has(full)) {
        seenMen.add(full);
        men.push(item);
      } else if (g === 'women' && !seenWomen.has(full)) {
        seenWomen.add(full);
        women.push(item);
      } else if (g === 'unisex' && !seenUnisex.has(full)) {
        seenUnisex.add(full);
        unisex.push(item);
      }
    }
  }

  // Also supplement from sizes array if any exist that weren't in rows
  for (const s of sizes) {
    if (!s || !s.trim()) continue;
    const { gender, rawSize } = parseGenderFromSize(s);
    const item: CategorizedSizeItem = {
      rawSize,
      fullSize: s.trim(),
      gender,
    };
    if (gender === 'men' && !seenMen.has(item.fullSize)) {
      seenMen.add(item.fullSize);
      men.push(item);
    } else if (gender === 'women' && !seenWomen.has(item.fullSize)) {
      seenWomen.add(item.fullSize);
      women.push(item);
    } else if (gender === 'unisex' && !seenUnisex.has(item.fullSize)) {
      seenUnisex.add(item.fullSize);
      unisex.push(item);
    }
  }

  const hasGenderSplit = (men.length > 0 && women.length > 0) || (men.length > 0 && unisex.length === 0) || (women.length > 0 && unisex.length === 0);

  return { men, women, unisex, hasGenderSplit };
}
