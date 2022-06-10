export interface Storing {
  storeDate?: Date;
  title?: string;
  products?: StoringProduct[];
}

export interface UpdateStoring extends Partial<Storing> {
  systemId: string;
}

export interface StoringProduct {
  productId: string;
  amount: number;
  unitCost?: number;
}
