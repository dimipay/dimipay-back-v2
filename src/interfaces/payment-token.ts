import { SpecialPurchaseType } from "@prisma/client";

export interface GeneralPaymentToken {
  paymentMethod: string;
  pin?: string;
  deviceKey?: string;
}

export interface SpecialPaymentToken {
  purchaseType: SpecialPurchaseType;
  paymentMethod: string;
  pin?: string;
  deviceKey?: string;
  extraFields: object;
}
