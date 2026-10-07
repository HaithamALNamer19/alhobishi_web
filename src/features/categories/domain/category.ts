export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

