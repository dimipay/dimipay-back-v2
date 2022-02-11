import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getTransactionHistories = async (req: Request, res: Response) => {
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
