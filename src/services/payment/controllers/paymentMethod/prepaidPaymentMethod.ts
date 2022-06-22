import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const createPrepaidCard = async (req: Request, res: Response) => {
  const prepaidCard = await prisma.paymentMethod.findFirst({
    where: {
      type: "PREPAID",
      ownerSid: req.user.systemId,
      is_deleted: false,
    },
  });

  if (prepaidCard)
    throw new HttpException(
      400,
      `새 카드를 등록하려면 기존에 등록된 카드를 삭제해주세요 (${prepaidCard.name})`
    );

  const { name, color } = req.body;

  const created = await prisma.paymentMethod.create({
    data: {
      type: "PREPAID",
      ownerSid: req.user.systemId,
      name,
      color: color ? color : null,
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
