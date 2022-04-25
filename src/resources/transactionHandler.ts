import { TransactionStatus, Coupon, Prisma } from "@prisma/client";
import { prisma } from "@src/resources";
import {
  TransactionPaymentMethod,
  ApprovalUserIdentity,
  UseualPurchase,
  SpecialPurchase,
} from "@src/interfaces";
import { TransactionException, HttpException } from "@src/exceptions";

export const approvePrepaidCard = async (
  paymentMethod: TransactionPaymentMethod,
  approveAmount: number
) => {
  if (paymentMethod.type !== "PREPAID") {
    throw new Error("선불카드가 아닙니다.");
  }

  const balance = paymentMethod.prepaidCard.balance - approveAmount;
  if (paymentMethod.prepaidCard.balance < 0) {
    throw new TransactionException("ERROR", "잔액이 부족합니다.");
  } else {
    await prisma.prepaidCard.update({
      where: {
        id: paymentMethod.prepaidCard.id,
      },
      data: {
        balance: balance,
      },
    });

    return "CONFIRMED";
  }
};

export const approveGeneralCard = (
  paymentMethod: TransactionPaymentMethod,
  approveAmount: number
) => {
  if (paymentMethod.type !== "GENERAL") {
    throw new Error("일반카드가 아닙니다.");
  }
};

export const chargePrepaidCard = async (
  paymentMethod: TransactionPaymentMethod,
  chargeAmount: number,
  method: string
) => {
  if (paymentMethod.type !== "PREPAID") {
    throw new Error("선불카드가 아닙니다.");
  }

  const balance = paymentMethod.prepaidCard.balance + chargeAmount;
  await prisma.prepaidCard.update({
    where: {
      id: paymentMethod.prepaidCard.id,
    },
    data: {
      balance: balance,
    },
  });
  await prisma.prepaidCardChargeHistory.create({
    data: {
      delta: chargeAmount,
      method: method,
      status: "CONFIRMED",
      detailInfo: "",
      prepaidCard: {
        connect: {
          id: paymentMethod.prepaidCard.id,
        },
      },
    },
  });
};

const calculateCouponDiscount = (amount: number, coupons: Coupon[]) => {
  const discounted = coupons.reduce((acc, coupon, idx, arr) => {
    const couponDiscount = acc - coupon.amount;
    if (couponDiscount < 0) {
      arr.splice(idx + 1);
      coupons.splice(idx + 1);
    }
    return couponDiscount;
  }, amount);

  return { discounted, coupons };
};

const approveTransaction = async (
  approvalAmount: number,
  paymentMethod: TransactionPaymentMethod,
  hasCoupons: boolean
): Promise<{ status: string; isCouponOnly: boolean }> => {
  if (approvalAmount > 0 || !hasCoupons) {
    try {
      if (paymentMethod.type === "PREPAID") {
        return {
          status: await approvePrepaidCard(paymentMethod, approvalAmount),
          isCouponOnly: false,
        };
      } else if (paymentMethod.type === "GENERAL") {
        // return await approveGeneralCard(paymentMethod, approvalAmount);
        throw new TransactionException(
          "CANCELED",
          "지원하지 않는 결제수단입니다."
        );
      }
    } catch (e) {
      return e.message;
    }
  } else if (approvalAmount < 0 && hasCoupons) {
    // 쿠폰 금액 페이머니로 적립
    chargePrepaidCard(
      paymentMethod,
      Math.abs(approvalAmount),
      "쿠폰 잔액 적립"
    );
    return {
      status: "CONFIRMED",
      isCouponOnly: true,
    };
  } else if (approvalAmount === 0 && hasCoupons) {
    // 쿠폰만으로 결제
    return {
      status: "CONFIRMED",
      isCouponOnly: true,
    };
  }
};

const couponProcess = async (
  couponIds: string[],
  totalPrice: number,
  hasCoupons: boolean
) => {
  if (hasCoupons) {
    const coupons = await prisma.coupon.findMany({
      where: {
        AND: [
          {
            id: { in: couponIds },
            usedTransactionId: null,
          },
          {
            OR: [
              {
                expiresAt: { gt: new Date() },
              },
              {
                expiresAt: null,
              },
            ],
          },
        ],
      },
      orderBy: [
        {
          amount: "desc",
        },
      ],
    });
    const { discounted: approvalAmount, coupons: usedCoupons } =
      calculateCouponDiscount(totalPrice, coupons); //쿠폰 금액 차감

    const usedCouponIds = usedCoupons.map((coupon) => {
      return { id: coupon.id };
    });

    return { approvalAmount, usedCouponIds };
  } else {
    return { approvalAmount: totalPrice, usedCouponIds: [] };
  }
};

export const useualPurchaseTransaction = async (
  userIdentity: ApprovalUserIdentity,
  totalPrice: any,
  products: UseualPurchase,
  hasCoupons = true
) => {
  try {
    if (userIdentity.authMethod === "INAPP" && !products.pos) {
      throw new TransactionException("CANCELED", "비정상적인 결제 요청입니다.");
    }

    const user = await prisma.user.findFirst({
      where: {
        systemId: userIdentity.systemId,
      },
    });

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: userIdentity.paymentMethod,
      },
      include: {
        generalCard: true,
        prepaidCard: true,
      },
    });

    const receipt = await prisma.$transaction(async (prisma) => {
      //1. 쿠폰 금액 차감
      //2. 카드 거래
      //3. 상품 재고 차감
      //4. 거래 내역 생성

      const { approvalAmount, usedCouponIds } = await couponProcess(
        // 쿠폰을 적용하고, 카드로 승인할 금액과 적용된 쿠폰을 반환합니다.
        userIdentity.coupons,
        totalPrice,
        hasCoupons
      );

      const { status: approvalStatus, isCouponOnly } = await approveTransaction(
        // 카드 거래를 승인합니다.
        approvalAmount,
        paymentMethod,
        hasCoupons
      );

      const productIds = products.orderedProducts.map((product) => {
        return { id: product.product.id };
      });

      // 상품 재고 차감
      const productReleases: Prisma.ProductInOutLogCreateManyInput[] =
        products.orderedProducts.map((product) => {
          return {
            delta: product.amount,
            message: "",
            productId: product.product.id,
          };
        });

      await prisma.productInOutLog.createMany({
        data: productReleases,
      });

      const receipt = await prisma.transaction.create({
        data: {
          totalPrice: totalPrice,
          status: approvalStatus as TransactionStatus,
          authMethod: userIdentity.authMethod,
          user: {
            connect: {
              id: user.id,
            },
          },
          posDevice: {
            connect: {
              id: products.pos.id,
            },
          },
          paymentMethod: {
            connect: {
              id: isCouponOnly ? null : paymentMethod.id,
            },
          },
          coupon: {
            connect: usedCouponIds,
          },
          products: {
            connect: productIds,
          },
        },
      });
      return receipt;
    });
    return receipt;
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};

export const specialPurchaseTransaction = async (
  userIdentity: ApprovalUserIdentity,
  totalPrice: number,
  products: SpecialPurchase,
  hasCoupons = true
) => {
  try {
    if (userIdentity.authMethod == "INAPP" && products.pos) {
      throw new TransactionException("CANCELED", "비정상적인 결제 요청입니다.");
    }

    const user = await prisma.user.findFirst({
      where: {
        systemId: userIdentity.systemId,
      },
    });

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: userIdentity.paymentMethod,
      },
      include: {
        generalCard: true,
        prepaidCard: true,
      },
    });

    const receipt = await prisma.$transaction(async (prisma) => {
      //1. 쿠폰 금액 차감
      //2. 카드 거래
      //3. 상품 재고 차감
      //4. 거래 내역 생성

      const { approvalAmount, usedCouponIds } = await couponProcess(
        // 쿠폰을 적용하고, 카드로 승인할 금액과 적용된 쿠폰을 반환합니다.
        userIdentity.coupons,
        totalPrice,
        hasCoupons
      );

      const { status: approvalStatus, isCouponOnly } = await approveTransaction(
        // 카드 거래를 승인합니다.
        approvalAmount,
        paymentMethod,
        hasCoupons
      );

      const receipt = await prisma.transaction.create({
        data: {
          totalPrice: totalPrice,
          status: approvalStatus as TransactionStatus,
          authMethod: userIdentity.authMethod,
          user: {
            connect: {
              id: user.id,
            },
          },
          posDevice: products.pos
            ? {
                connect: {
                  id: products.pos.id,
                },
              }
            : undefined,
          paymentMethod: isCouponOnly
            ? undefined
            : {
                connect: {
                  id: paymentMethod.id,
                },
              },
          coupon: {
            connect: usedCouponIds,
          },
          specialPurchase: JSON.stringify(products.purchaseId),
          specialPurchaseType: products.purchaseType,
        },
      });
      return receipt;
    });
    return receipt;
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
