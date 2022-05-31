import {
  TransactionMethod,
  Product,
  DiscountPolicy,
  Category,
  PosDevice,
  PurchaseType,
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

export interface GeneralPurchase {
  orderedProducts: ApprovalProduct[];
  pos: PosDevice;
}

export interface SpecialPurchase {
  purchaseId: string[];
  purchaseType: PurchaseType;
  pos?: PosDevice;
}
