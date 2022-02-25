import { prisma } from "@src/resources";
import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";

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

export const getUserbySearch = async (req: Request, res: Response) => {
  try {
    res.json(
      await prisma.user.findMany({
        where: {
          OR: [
            { name: { startsWith: req.params.search } },
            { studentNumber: { startsWith: req.params.search } },
          ],
        },
        select: {
          systemId: true,
          studentNumber: true,
          name: true,
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, e);
  }
};
