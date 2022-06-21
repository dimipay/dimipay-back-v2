import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { CardInfo, ReqWithBody } from "@src/types";
import { Response } from "express";
import { getBillingkey } from "../../utils/getBillingkey";

export const addGeneralPaymentmethod = async (
  req: ReqWithBody<CardInfo>,
  res: Response
) => {
  const { user } = req;

  const registeredGeneralCard = await prisma.paymentMethod.findFirst({
    where: {
      type: "GENERAL",
      ownerId: user.id,
    },
  });

  if (registeredGeneralCard)
    throw new HttpException(
      400,
      `새 카드를 등록하려면 기존에 등록된 카드를 삭제해주세요 (${registeredGeneralCard.name})`
    );

  const cardInfo = req.body;

  const payableInfo = await getBillingkey(cardInfo);
  if (!payableInfo) throw new HttpException(400, "카드 정보가 올바르지 않아요");

  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      type: "GENERAL",
      ownerId: user.id,
      name: payableInfo.name,
      generalCard: {
        create: {
          ...cardInfo,
          billingKey: payableInfo.billingKey,
        },
      },
    },
  });

  if (paymentMethod)
    return res.json({
      name: payableInfo.name,
    });

  throw new HttpException(500, "카드 정보 저장에 실패했어요");
};
