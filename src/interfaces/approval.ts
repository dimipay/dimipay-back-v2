import { TransactionAuthMethod, Product, DiscountPolicy, Category } from "@prisma/client";

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
    authMethod: TransactionAuthMethod;
    coupons?: string[];
}

export interface ApprovalOrder {
    products: ApprovalProduct[];
    userIdentity: ApprovalUserIdentity;
}