import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const updatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { systemId } = req.params;
    const { name, color } = req.body;

    const updated = await prisma.paymentMethod.update({
      where: {
        systemId: systemId,
      },
      data: {
        name: name,
        color: color,
      },
    });
    return res.json({
      success: true,
    });
  } catch (e) {
    if (e instanceof HttpException) {
      throw new HttpException(e.status, e.message);
    }
    throw new HttpException(
      400,
      "카드 수정에 오류가 발생했어요. 다시 시도해주세요."
    );
  }
};

export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { systemId } = req.params;

    const updated = await prisma.paymentMethod.update({
      where: {
        systemId: systemId,
      },
      data: {
        IS_DELETED: true,
      },
    });
    return res.json({
      success: true,
    });
  } catch (e) {
    if (e instanceof HttpException) {
      throw new HttpException(e.status, e.message);
    }
    throw new HttpException(
      400,
      "카드 삭제에 오류가 발생했어요. 다시 시도해주세요."
    );
  }
};

export const getPaymentMethods = async (req: Request, res: Response) => {
  const { isCreditOnly } = req.query;
  const { user } = req;

  const paymentMethod = await prisma.paymentMethod.findMany({
    where: {
      ownerSid: user.systemId,
      type: isCreditOnly !== undefined ? "GENERAL" : undefined,
      IS_DELETED: false,
    },
    select: {
      createdAt: true,
      updatedAt: true,
      type: true,
      color: true,
      name: true,
      ownerSid: true,
      systemId: true,
      prepaidCard: {
        select: {
          balance: true,
        },
      },
    },
  });

  const methods = paymentMethod.map((method) => {
    const { prepaidCard, ...methodData } = method;
    if (method.prepaidCard) {
      return {
        ...methodData,
        balance: method.prepaidCard.balance,
      };
    } else {
      return methodData;
    }
  });

  res.json({ methods });
};
