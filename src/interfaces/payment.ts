import { Transaction_authMethod, PaymentMethodType } from "@prisma/client";

export interface PaymentApprovalRequest {
  userId: string;
  paymentMethod: PaymentMethodType;
  userCardId: string;
  couponIds: string[];
  billingAmount: number;
  userAuthMethod: Transaction_authMethod;
  productsId: string[];
}

export interface Transaction extends PaymentApprovalRequest {
  posDeviceId: string;
}
