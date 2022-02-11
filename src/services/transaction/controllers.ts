import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getTransactionHistories = async (req: Request) => {
  const user = await prisma.transaction.findFirst({
    where: {
      id: req.user.id,
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

  return user;
};

export const getMonthlyTransaction = async (req: Request) => {
  const queryStartRange = new Date(`${req.params.year}-${req.params.month}-01`);
  const queryEndRange = new Date(+queryStartRange);

  queryEndRange.setMonth(queryEndRange.getMonth() + 1);
  queryEndRange.setDate(1);

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: queryStartRange,
        lt: queryEndRange,
      },
    },
  });

  return transactions;
};
