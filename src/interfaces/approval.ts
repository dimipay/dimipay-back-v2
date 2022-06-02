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
  product?: Product & {
    category: Category & {
      discountPolicy: DiscountPolicy[];
    };
    excludedDiscountPolicy: DiscountPolicy[];
    targettedDiscountPolicy: DiscountPolicy[];
  };
  amount: number;
  unit?: number; // 해당 거래의 상품 단가
  total?: number; // 해당 거래의 상품 총 가격
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
  purchaseIds: string[];
  purchaseType: PurchaseType;
  pos?: PosDevice;
}

export interface GeneralPurchaseDetail {
  systemId: string;
  amount: number;
  unit: number;
  total: number;
}
