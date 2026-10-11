import { describe, it, expect } from 'vitest';
import {
  convertCmToInches,
  convertInchesToCm,
  formatSizeMeasurement,
  formatFullSizeLabel,
  parseGenderFromSize,
  getAvailableGenders,
  categorizeProductSizes,
  SIZING_PRESETS,
} from './SizeGuide';

describe('SizeGuide unit conversions', () => {
  describe('convertInchesToCm', () => {
    it('converts single integer inches to centimeters rounded to nearest integer', () => {
      expect(convertInchesToCm('27')).toBe('69');
      expect(convertInchesToCm('38')).toBe('97');
      expect(convertInchesToCm('26.4')).toBe('67');
    });

    it('converts ranges in inches to centimeters', () => {
      expect(convertInchesToCm('38 – 40')).toBe('97 – 102');
      expect(convertInchesToCm('30 - 32')).toBe('76 - 81');
      expect(convertInchesToCm('35.4 – 37.4')).toBe('90 – 95');
    });

    it('strips in suffix or quotes and converts numbers', () => {
      expect(convertInchesToCm('38 – 40 in')).toBe('97 – 102');
      expect(convertInchesToCm('27"')).toBe('69');
      expect(convertInchesToCm('27 inches')).toBe('69');
    });

    it('preserves text annotations like (Inseam)', () => {
      expect(convertInchesToCm('5 (Inseam)')).toBe('13 (Inseam)');
      expect(convertInchesToCm('5.5 in (Inseam)')).toBe('14 (Inseam)');
    });

    it('preserves N/A, dashes and empty strings', () => {
      expect(convertInchesToCm('N/A')).toBe('N/A');
      expect(convertInchesToCm('—')).toBe('—');
      expect(convertInchesToCm('')).toBe('—');
    });
  });

  describe('convertCmToInches (legacy helper)', () => {
    it('converts single integer centimeters to inches rounded to 1 decimal', () => {
      expect(convertCmToInches('67')).toBe('26.4');
      expect(convertCmToInches('65')).toBe('25.6');
      expect(convertCmToInches('70')).toBe('27.6');
    });

    it('converts ranges in centimeters to inches', () => {
      expect(convertCmToInches('90 – 95')).toBe('35.4 – 37.4');
      expect(convertCmToInches('76 - 81')).toBe('29.9 - 31.9');
      expect(convertCmToInches('96-101')).toBe('37.8-39.8');
    });

    it('strips cm suffix and converts numbers', () => {
      expect(convertCmToInches('90 – 95 cm')).toBe('35.4 – 37.4');
      expect(convertCmToInches('67cm')).toBe('26.4');
    });
  });

  describe('formatSizeMeasurement', () => {
    it('returns inches values when unit is in, stripping redundant in text', () => {
      expect(formatSizeMeasurement('38 – 40 in', 'in')).toBe('38 – 40');
      expect(formatSizeMeasurement('27', 'in')).toBe('27');
      expect(formatSizeMeasurement('5 (Inseam)', 'in')).toBe('5 (Inseam)');
    });

    it('returns converted centimeters when unit is cm', () => {
      expect(formatSizeMeasurement('38 – 40', 'cm')).toBe('97 – 102');
      expect(formatSizeMeasurement('27 in', 'cm')).toBe('69');
      expect(formatSizeMeasurement('5 (Inseam)', 'cm')).toBe('13 (Inseam)');
      expect(formatSizeMeasurement('35.4 – 37.4', 'cm')).toBe('90 – 95');
    });

    it('handles empty or undefined values gracefully', () => {
      expect(formatSizeMeasurement(undefined, 'in')).toBe('—');
      expect(formatSizeMeasurement('', 'cm')).toBe('—');
      expect(formatSizeMeasurement('N/A', 'cm')).toBe('N/A');
    });
  });

  describe('formatFullSizeLabel', () => {
    it('formats Men and Women sizes with prefixes', () => {
      expect(formatFullSizeLabel('M', 'men')).toBe("Men's M");
      expect(formatFullSizeLabel('S', 'women')).toBe("Women's S");
      expect(formatFullSizeLabel('L', 'unisex')).toBe('L');
    });

    it('does not duplicate existing gender prefix', () => {
      expect(formatFullSizeLabel("Men's M", 'men')).toBe("Men's M");
      expect(formatFullSizeLabel("Women's S", 'women')).toBe("Women's S");
    });
  });

  describe('parseGenderFromSize', () => {
    it('parses Men and Women sizes accurately', () => {
      expect(parseGenderFromSize("Men's M")).toEqual({ gender: 'men', rawSize: 'M' });
      expect(parseGenderFromSize("Women's S")).toEqual({ gender: 'women', rawSize: 'S' });
      expect(parseGenderFromSize('L')).toEqual({ gender: 'unisex', rawSize: 'L' });
    });
  });

  describe('getAvailableGenders and categorizeProductSizes', () => {
    it('identifies men and women genders from rows', () => {
      const rows = [
        { gender: 'men' as const, size: 'M' },
        { gender: 'women' as const, size: 'S' },
      ];
      expect(getAvailableGenders(rows)).toEqual(['men', 'women']);
    });

    it('categorizes sizes into separate sets for men and women', () => {
      const rows = [
        { gender: 'men' as const, size: 'S' },
        { gender: 'men' as const, size: 'M' },
        { gender: 'women' as const, size: 'XS' },
        { gender: 'women' as const, size: 'S' },
      ];
      const result = categorizeProductSizes([], rows);
      expect(result.hasGenderSplit).toBe(true);
      expect(result.men.map((i) => i.fullSize)).toEqual(["Men's S", "Men's M"]);
      expect(result.women.map((i) => i.fullSize)).toEqual(["Women's XS", "Women's S"]);
    });

    it('provides sizing presets with valid men and women rows', () => {
      expect(SIZING_PRESETS.length).toBeGreaterThan(0);
      const vestPreset = SIZING_PRESETS.find((p) => p.id === 'vest_gendered');
      expect(vestPreset).toBeDefined();
      expect(vestPreset!.rows.some((r) => r.gender === 'men')).toBe(true);
      expect(vestPreset!.rows.some((r) => r.gender === 'women')).toBe(true);
    });
  });
});
