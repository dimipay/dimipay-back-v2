import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const createPrepaidCard = async (req: Request, res: Response) => {
  const prepaidCard = await prisma.paymentMethod.findFirst({
    where: {
      type: "PREPAID",
      ownerId: req.user.id,
    },
  });

  if (prepaidCard) throw new HttpException(400, "이미 가입이 완료되었어요");

  const created = await prisma.paymentMethod.create({
    data: {
      type: "PREPAID",
      ownerId: req.user.id,
      prepaidCard: {
        create: {
          balance: 0,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (created.id)
    return res.json({
      success: true,
    });

  throw new HttpException(500, "가입에 오류가 발생했어요. 다시 시도해주세요.");
};
