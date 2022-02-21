import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getMyInfo = async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst({
    where: {
      systemId: req.user.systemId,
    },
    select: {
      systemId: true,
      createdAt: true,
      updatedAt: true,
      isDisabled: true,
      accountName: true,
      name: true,
      profileImage: true,
      studentNumber: true,
      receivedCoupons: true,
      paymentMethods: true,
    },
  });

  return res.json({ me: user });
};
