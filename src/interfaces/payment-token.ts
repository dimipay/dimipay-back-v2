import { PurchaseType } from "@prisma/client";

export interface GeneralPaymentToken {
  paymentMethod: string;
  pin?: string;
  bioKey?: string;
  iat?: string;
  exp?: string;
}

export interface SpecialPaymentToken {
  purchaseType: PurchaseType;
  paymentMethod: string;
  pin?: string;
  bioKey?: string;
  iat?: string;
  exp?: string;
  extraFields: object;
}
