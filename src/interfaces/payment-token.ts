import { SpecialPurchaseType } from "@prisma/client";

export interface GeneralPaymentToken {
  paymentMethod: string;
  pin?: string;
  bioKey?: string;
}

export interface SpecialPaymentToken {
  purchaseType: SpecialPurchaseType;
  paymentMethod: string;
  pin?: string;
  bioKey?: string;
  extraFields: object;
}
