import { GeneralPurchaseDetail } from "@src/interfaces";
import { Prisma, PurchaseType } from "@prisma/client";
import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getTransactionHistories = async (req: Request, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.user.id,
    },
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      products: {
        select: {
          name: true,
        },
      },
      totalPrice: true,
    },
  });

  return res.json(transactions);
};

export const getMonthlyTransaction = async (req: Request, res: Response) => {
  const queryStartRange = new Date(`${req.params.year}-${req.params.month}-01`);
  const queryEndRange = new Date(+queryStartRange);

  queryEndRange.setMonth(queryEndRange.getMonth() + 1);
  queryEndRange.setDate(1);

  const transactions: {
    systemId: string;
    createdAt: Date;
    updatedAt: Date;
    purchaseType: PurchaseType;
    purchaseDetail: Prisma.JsonValue;
    products: {
      systemId: string;
      name: string;
      unitPrice?: number;
      totalPrice?: number;
      amount?: number;
    }[];
  }[] = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: queryStartRange,
        lt: queryEndRange,
      },
      userId: req.user.id,
    },
    select: {
      systemId: true,
      createdAt: true,
      updatedAt: true,
      purchaseType: true,
      purchaseDetail: true,
      totalPrice: true,
      products: {
        select: {
          systemId: true,
          name: true,
        },
      },
    },
  });

  // General Purchase의 경우에는 상품 정보 relation에 purchaseDetail의 데이터를 끼워넣음
  // purchaseDetail에 있는 데이터는 할인 적용된 상품단가, 상품 수량, 총 가격.
  // General Purchase가 아닌 경우에는 상품 정보 relation을 빼고 purchaseDetail을 Raw로 넘김. 이후 클라이언트 단에서 구매 타입 확인 후 처리.

  const mappedTransactions = transactions.map((transaction) => {
    const { products, purchaseDetail, ...etc } = transaction;
    if (transaction.purchaseType === "GENERAL") {
      const mappedProducts = transaction.products.map((product) => {
        const productPurchaseDetail = (
          purchaseDetail as any as GeneralPurchaseDetail[]
        ).find((p) => p.systemId === product.systemId);
        product.unitPrice = productPurchaseDetail.unit;
        product.totalPrice = productPurchaseDetail.total;
        product.amount = productPurchaseDetail.amount;

        return product;
      });

      return { ...etc, products: mappedProducts };
    } else {
      return { ...etc, purchaseDetail };
    }
  });

  return res.json(mappedTransactions);
};
