import { prisma, verify } from "@src/resources";
import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import { genPubKey, decrypt } from "dimipay-backend-crypto-engine";
import { User } from "@prisma/client";

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
            { name: { contains: req.params.search } },
            { studentNumber: { startsWith: req.params.search } },
          ],
        },
        select: {
          systemId: true,
          studentNumber: true,
          name: true,
        },
        take: 5,
      })
    );
  } catch (e) {
    throw new HttpException(400, e);
  }
};

export const getUserCertkey = async (req: Request, res: Response) => {
  try {
    return res.json({ certkey: genPubKey<User>(req.user) });
  } catch (e) {
    throw new HttpException(400, "결제 키 생성 실패");
  }
};

export const getUserbyApprovalToken = async (req: Request, res: Response) => {
  try {
    const { a } = await verify(req.body.approvalToken);
    const [systemId, paymentMethod] = a;
    const user = await prisma.user.findFirst({
      where: {
        systemId,
      },
      select: {
        systemId: true,
        isDisabled: true,
        name: true,
        profileImage: true,
        studentNumber: true,
        receivedCoupons: true,
      },
    });

    if (!user.isDisabled)
      throw new HttpException(400, "비활성화된 계정입니다.");
    return res.json({ ...user, paymentMethod });
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
