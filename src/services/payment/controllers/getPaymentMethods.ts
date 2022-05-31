import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getPaymentMethods = async (req: Request, res: Response) => {
  const { isCreditOnly } = req.query;
  const { user } = req;

  const paymentMethod = await prisma.paymentMethod.findMany({
    where: {
      ownerId: user.systemId,
      type: isCreditOnly !== undefined ? "GENERAL" : undefined,
    },
    select: {
      createdAt: true,
      updatedAt: true,
      type: true,
      color: true,
      name: true,
      ownerId: true,
      systemId: true,
      prepaidCard: {
        select: {
          balance: true,
        },
      },
    },
  });

  const methods = paymentMethod.map((method) => {
    const { prepaidCard, ...methodData } = method;
    if (method.prepaidCard) {
      return {
        ...methodData,
        balance: method.prepaidCard.balance,
      };
    } else {
      return methodData;
    }
  });

  res.json({ methods });
};
