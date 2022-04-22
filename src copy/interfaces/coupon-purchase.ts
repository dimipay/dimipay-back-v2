export interface CouponPurchase {
    title?: string;
    to: string[];
    amount: number;
    expiresAt?: Date;
  }

export interface CouponPurchaseReqBody {
    purchaseToken: string;
    coupon: CouponPurchase;
}