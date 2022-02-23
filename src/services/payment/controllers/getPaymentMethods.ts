import { prisma } from "@src/resources";
import { ReqWithBody } from "@src/types";
import { Response } from "express";

export const getPaymentMethods = async (
  req: ReqWithBody<{
    isCreditOnly: boolean;
  }>,
  res: Response
) => {
  const { isCreditOnly } = req.body;
  const { user } = req;

  const paymentMethod = await prisma.paymentMethod.findMany({
    where: {
      ownerId: user.systemId,
      generalCard: isCreditOnly && {
        isNot: null,
      },
    },
  });

  res.json({ paymentMethod });
};
