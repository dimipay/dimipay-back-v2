import { User } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
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

export const purchaseCoupon = async (req: Request, res: Response) => {
  try {
    const { name, to, amount, expiresAt } = req.body;
    const coupons: {
      name: string;
      amount: number;
      expiresAt?: Date;
      receiver: {
        connect: {
          systemId: string;
        };
      };
    }[] = [];

    // 여기에 PG 연동 함수가 들어갑니다.

    to.forEach(async (userId: string) => {
      coupons.push({
        name,
        amount,
        expiresAt,
        receiver: { connect: { systemId: userId } },
      });
    });
    await prisma.user.update({
      where: { systemId: req.user.systemId },
      data: {
        issuedCoupons: {
          create: coupons,
        },
      },
    });
    return res.sendStatus(201);
  } catch (e) {
    console.log(e);
    throw new HttpException(400, "쿠폰을 구매하는 중 오류가 발생했습니다.");
  }
};
