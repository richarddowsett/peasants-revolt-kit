export interface SizeGuideRow {
  size: string;
  chest?: string;
  waist?: string;
  length?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  sizes: string[];
  sizeGuideCategory?: string;
  sizeGuideRows?: SizeGuideRow[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

