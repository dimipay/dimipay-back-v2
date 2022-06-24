import { Coupon } from "@prisma/client";
import { prisma } from "@src/resources";
import { TransactionPaymentMethod } from "@src/interfaces";
import { TransactionException } from "@src/exceptions";

export const approvePrepaidCard = async (
  paymentMethod: TransactionPaymentMethod,
  approveAmount: number
) => {
  if (paymentMethod.type !== "PREPAID") {
    throw new Error("선불카드가 아닙니다.");
  }

  const balance = paymentMethod.prepaidCard.balance - approveAmount;
  if (balance < 0) {
    throw new TransactionException("CANCELED", "잔액이 부족합니다.");
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
  paymentMethodId: string,
  chargeAmount: number,
  method: string
) => {
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { systemId: paymentMethodId },
    select: {
      type: true,
      prepaidCard: true,
    },
  });
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

export const calculateCouponDiscount = (amount: number, coupons: Coupon[]) => {
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

export const approveTransaction = async (
  approvalAmount: number,
  paymentMethod: TransactionPaymentMethod,
  hasCoupons: boolean
): Promise<{ status: string; isCouponOnly: boolean }> => {
  if (approvalAmount > 0 || !hasCoupons) {
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
  } else if (approvalAmount < 0 && hasCoupons) {
    // 쿠폰 금액 페이머니로 적립
    chargePrepaidCard(
      paymentMethod.systemId,
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

export const couponProcess = async (
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
            usedTransactionSid: null,
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
