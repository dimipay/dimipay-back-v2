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
  });

  res.json({ paymentMethod });
};
