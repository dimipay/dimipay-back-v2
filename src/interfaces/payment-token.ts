import { SpecialPurchaseType } from "@prisma/client";

export interface GeneralPaymentToken {
  paymentMethod: string;
  pin?: string;
  bioKey?: string;
  iat?: string;
  exp?: string;
}

export interface SpecialPaymentToken {
  purchaseType: SpecialPurchaseType;
  paymentMethod: string;
  pin?: string;
  bioKey?: string;
  iat?: string;
  exp?: string;
  extraFields: object;
}
