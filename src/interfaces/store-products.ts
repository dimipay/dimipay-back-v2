import { Product } from "@prisma/client";
export interface Storing {
  storeDate?: Date;
  title?: string;
  products?: StoringProduct[];
}

export interface UpdateStoring extends Partial<Storing> {
  systemId: string;
}

export interface StoringProduct extends Partial<Product> {
  amount: number;
}
