import { Prisma, TransactionMethod, User } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import { prisma, specialPurchaseTransaction } from "@src/resources";
import { CouponPurchaseFields } from "@src/interfaces";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

export const getVaildReceivedCoupons = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.coupon.findMany({
        where: {
          AND: [
            {
              receiverId: req.user.id,
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
            {
              usedTransactionId: null,
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          issuer: {
            select: {
              name: true,
              isTeacher: true,
              systemId: true,
            },
          },
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, "쿠폰을 조회하는 중 오류가 발생했습니다.");
  }
};

export const getAllReceivedCoupons = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.coupon.findMany({
        where: {
          receiverId: req.user.id,
        },
        orderBy: {
          usedTransactionId: "asc",
        },
        include: {
          receiver: {
            select: {
              name: true,
              isTeacher: true,
              systemId: true,
            },
          },
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, "쿠폰을 조회하는 중 오류가 발생했습니다.");
  }
};

export const getIssuedCoupons = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.coupon.findMany({
        where: {
          issuerId: req.user.id,
        },
        include: {
          receiver: {
            select: {
              name: true,
              isTeacher: true,
              systemId: true,
            },
          },
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, "쿠폰을 조회하는 중 오류가 발생했습니다.");
  }
};

export const purchaseCoupon = async (req: Request, res: Response) => {
  const { paymentMethod, purchaseType, extraFields } = req.body;
  const { title, to, amount, expiresAt } = extraFields as CouponPurchaseFields;
  if (purchaseType !== "COUPON") {
    throw new HttpException(400, "잘못된 구매 요청입니다.");
  }

  const userIdentity = {
    systemId: req.user.systemId,
    paymentMethod,
    transactionMethod: "INAPP" as TransactionMethod,
  };

  const destinationUsers = await prisma.user.findMany({
    where: {
      systemId: { in: to },
    },
  });

  const totalPrice = amount * to.length;

  await prisma.$transaction(async (prisma) => {
    const coupons: Prisma.CouponCreateManyInput[] = destinationUsers.map(
      (destination) => ({
        id: uuidv4(),
        name: title,
        amount,
        expiresAt,
        receiverId: destination.id,
        issuerId: req.user.id,
      })
    );

    const purchaseIds = coupons.map((coupon) => coupon.id);

    await prisma.coupon.createMany({ data: coupons });

    const transaction = await specialPurchaseTransaction(
      userIdentity,
      totalPrice,
      {
        purchaseIds,
        purchaseType,
      },
      false
    );

    const receivers = await Promise.all(
      to.map((systemId) =>
        prisma.user.findUnique({
          where: {
            systemId,
          },
          select: { id: true },
        })
      )
    );

    if (!receivers.every(Boolean))
      throw new HttpException(400, "쿠폰의 수신자가 올바르지 않아요");

    return res.json(transaction).status(201);
  });
  try {
  } catch (e) {
    throw new HttpException(400, e.message);
  }
};
