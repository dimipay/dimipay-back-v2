import { hashSync } from "bcrypt";
import { Prisma } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import {
  logger,
  prisma,
  createTempToken,
  verifyCustomToken,
} from "@src/resources";

import type { Response } from "express";
import type { ReqWithBody } from "@src/types";
import type { ChangePayInfo } from "@src/interfaces";
import type { TempTokenPayload } from "@src/resources";

export default async (req: ReqWithBody<ChangePayInfo>, res: Response) => {
  const body = req.body;
  const { paymentPin, deviceUid, bioKey } = body;

  try {
    if (!body.token) {
      throw new HttpException(400, "토큰이 없습니다.");
    }
    const systemId = verifyCustomToken<TempTokenPayload>(body.token).tempId;

    const existingInfo: ChangePayInfo = await prisma.user.findUnique({
      where: { systemId },
      select: {
        paymentPin: true,
        deviceUid: true,
        bioKey: true,
      },
    });

    for (const key of [
      "paymentPin",
      "deviceUid",
      "bioKey",
    ] as (keyof ChangePayInfo)[]) {
      if (body[key] && existingInfo[key]) {
        throw new HttpException(400, `이미 존재하는 값입니다: ${key}`);
      }
    }

    await prisma.user.update({
      where: { systemId },
      data: {
        ...(paymentPin && { paymentPin: hashSync(paymentPin, 10) }),
        ...(deviceUid && { deviceUid }),
        ...(bioKey && { bioKey }),
      },
    });

    logger.info(`${systemId} set first payment pin`);

    return res.status(201).json({
      code: "OK",
      message: "정상적으로 처리되었습니다.",
      ...(body.newToken ? { token: createTempToken(systemId) } : {}),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      logger.warn("PrismaClientKnownRequestError:", e);
      throw new HttpException(400, "서버 오류입니다.");
    }

    throw new HttpException(e.status, e.message);
  }
};
