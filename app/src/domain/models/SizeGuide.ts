export interface SizeGuideMeasurement {
  size: string;
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
