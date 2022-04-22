import { Prisma, User } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import { CouponPurchase, CouponPurchaseReqBody } from "@src/interfaces";
import { prisma, paymentToken } from "@src/resources";
import { ReqWithBody } from "@src/types";
import { Request, Response } from "express";

export const getRecivedCoupons = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.coupon.findMany({
        where: {
          AND: [
            {
              receiverId: req.user.systemId,
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
          ],
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

export const getIssuedCoupons = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.coupon.findMany({
        where: {
          AND: [
            {
              issuerId: req.user.systemId,
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
          ],
        },
        include: {
          receiver: {
            select: {
              name: true,
              isTeacher: true,
              systemId: true,
              studentNumber: true,
            },
          },
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, "쿠폰을 조회하는 중 오류가 발생했습니다.");
  }
};

export const purchaseCoupon = async (
  req: ReqWithBody<CouponPurchaseReqBody>,
  res: Response
) => {
  try {
    const { purchaseToken, coupon } = req.body;
    const { title, to, amount, expiresAt } = coupon;
    const { purchaseType, paymentMethod } = await paymentToken.decrypt({
      encryptedToken: purchaseToken,
    });

    if (purchaseType !== "COUPON") {
      throw new HttpException(400, "잘못된 구매 요청입니다.");
    }
    // 여기에 PG 연동 함수가 들어갑니다.

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

    const coupons: Prisma.CouponCreateManyInput[] = to.map((systemId) => ({
      name: title,
      amount,
      expiresAt,
      receiverId: systemId,
      issuerId: req.user.systemId,
    }));

    await prisma.coupon.createMany({
      data: coupons,
    });

    return res.sendStatus(201);
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException(400, "쿠폰을 구매하는 중 오류가 발생했습니다.");
  }
};
