import { Prisma, User } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { ReqWithBody } from "@src/types";
import { Request, Response } from "express";

export const getRecivedCoupons = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.coupon.findMany({ where: { receiverId: req.user.systemId } })
    );
  } catch (e) {
    throw new HttpException(400, "쿠폰을 조회하는 중 오류가 발생했습니다.");
  }
};

export const getIssuedCoupons = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.coupon.findMany({ where: { issuerId: req.user.systemId } })
    );
  } catch (e) {
    throw new HttpException(400, "쿠폰을 조회하는 중 오류가 발생했습니다.");
  }
};

export const purchaseCoupon = async (
  req: ReqWithBody<{
    name?: string;
    to: string[];
    amount: number;
    expiresAt?: string;
  }>,
  res: Response
) => {
  try {
    const {
      name = `${req.user.name} 선생님의 사랑`,
      to,
      amount,
      expiresAt,
    } = req.body;

    // 여기에 PG 연동 함수가 들어갑니다.

    const receivers = await Promise.all(
      to.map((systemId) =>
        prisma.user.findUnique({
          where: {
            systemId,
          },
        })
      )
    );

    if (!receivers.every(Boolean)) {
      throw new HttpException(400, "쿠폰의 수신자가 올바르지 않아요");
    }

    const coupons: Prisma.CouponCreateManyInput[] = to.map((systemId) => ({
      name,
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
    console.log(e);
    if (e instanceof HttpException) throw e;
    throw new HttpException(400, "쿠폰을 구매하는 중 오류가 발생했습니다.");
  }
};
