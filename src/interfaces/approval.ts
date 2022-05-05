import {
  TransactionMethod,
  Product,
  DiscountPolicy,
  Category,
  PosDevice,
  SpecialPurchaseType,
} from "@prisma/client";

export interface ApprovalProduct {
  productId: string;
  amount: number;
  product?: Product & {
    category: Category & {
      discountPolicy: DiscountPolicy[];
    };
    excludedDiscountPolicy: DiscountPolicy[];
    targettedDiscountPolicy: DiscountPolicy[];
  };
}

export interface ApprovalUserIdentity {
  systemId: string;
  paymentMethod: string;
  transactionMethod: TransactionMethod;
  coupons?: string[];
}

export interface ApprovalOrder {
  products: ApprovalProduct[];
  userIdentity: ApprovalUserIdentity;
}

export interface UseualPurchase {
  orderedProducts: ApprovalProduct[];
  pos: PosDevice;
}

export interface SpecialPurchase {
  purchaseId: string[];
  purchaseType: SpecialPurchaseType;
  pos?: PosDevice;
}
