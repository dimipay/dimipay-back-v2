import { PaymentMethod, TransactionStatus } from "@prisma/client";
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
