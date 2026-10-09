export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  sizes: string[];
  sizeGuideCategory?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
