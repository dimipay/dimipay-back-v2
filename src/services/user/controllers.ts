import { prisma, verify, loadRedis, key } from "@src/resources";
import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import { rsa } from "@src/resources";
import SHA3 from "sha3";

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
    return res.json({
      certkey: await rsa.pubkey({ identity: req.user }),
    });
  } catch (e) {
    throw new HttpException(400, "결제 암호키 생성 실패");
  }
};

export const getUserbyApprovalCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    const hash = new SHA3(224);
    const redis = await loadRedis();
    const redisKey = key.approvalCode(
      hash.update(hash.update(code).digest("hex")).digest("hex")
    );
    const redisValue = await redis.get(redisKey);
    redis.del(redisKey);
    if (!redisValue) {
      throw new HttpException(400, "유효하지 않거나 만료된 승인 코드입니다.");
    }

    const { systemId, paymentMethod } = JSON.parse(redisValue);
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

    if (user.isDisabled) throw new HttpException(400, "비활성화된 계정입니다.");
    return res.json({ ...user, paymentMethod });
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
