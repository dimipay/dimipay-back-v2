import { prisma, logger, createToken, verify } from "@src/resources";
import { HttpException } from "@src/exceptions";
import bcrypt from "bcrypt";

import type { Response, Request } from "express";

export default async (req: Request, res: Response) => {
  try {
    const { originalPin, resetPin } = req.body;
    if (!req.user.paymentPin)
      throw new HttpException(400, "결제 비밀번호가 등록되지 않았어요.");
    const { paymentPin: encryptedOriginalPin } = await prisma.user.findFirst({
      where: { systemId: req.user.systemId },
      select: { paymentPin: true },
    });
    if (!bcrypt.compareSync(originalPin, encryptedOriginalPin))
      throw new HttpException(400, "이전 결제 비밀번호가 일치하지 않아요.");
    await prisma.user.update({
      where: { systemId: req.user.systemId },
      data: { paymentPin: bcrypt.hashSync(resetPin, 10) },
    });
    return res.sendStatus(201);
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
