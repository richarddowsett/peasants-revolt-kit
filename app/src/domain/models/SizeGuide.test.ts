import { describe, it, expect } from 'vitest';
import { convertCmToInches, formatSizeMeasurement } from './SizeGuide';

describe('SizeGuide unit conversions', () => {
  describe('convertCmToInches', () => {
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

    it('preserves text annotations like (Inseam)', () => {
      expect(convertCmToInches('12 (Inseam)')).toBe('4.7 (Inseam)');
      expect(convertCmToInches('14cm (Inseam)')).toBe('5.5 (Inseam)');
    });

    it('preserves N/A, dashes and empty strings', () => {
      expect(convertCmToInches('N/A')).toBe('N/A');
      expect(convertCmToInches('—')).toBe('—');
      expect(convertCmToInches('')).toBe('—');
    });
  });

  describe('formatSizeMeasurement', () => {
    it('returns cm values when unit is cm, stripping redundant cm units', () => {
      expect(formatSizeMeasurement('90 – 95 cm', 'cm')).toBe('90 – 95');
      expect(formatSizeMeasurement('67', 'cm')).toBe('67');
      expect(formatSizeMeasurement('12 (Inseam)', 'cm')).toBe('12 (Inseam)');
    });

    it('returns converted inches when unit is in', () => {
      expect(formatSizeMeasurement('90 – 95', 'in')).toBe('35.4 – 37.4');
      expect(formatSizeMeasurement('67 cm', 'in')).toBe('26.4');
      expect(formatSizeMeasurement('12 (Inseam)', 'in')).toBe('4.7 (Inseam)');
    });

    it('handles empty or undefined values gracefully', () => {
      expect(formatSizeMeasurement(undefined, 'cm')).toBe('—');
      expect(formatSizeMeasurement('', 'in')).toBe('—');
      expect(formatSizeMeasurement('N/A', 'in')).toBe('N/A');
    });
  });
});
