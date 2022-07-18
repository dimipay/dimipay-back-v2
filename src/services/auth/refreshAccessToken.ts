import { Prisma } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import {
  prisma,
  verify,
  logger,
  getTokenType,
  createTokenFromId,
} from "@src/resources";

import type { Request, Response } from "express";

export default async (req: Request, res: Response) => {
  const refreshToken = req.token;

  if (!refreshToken) {
    throw new HttpException(400, "리프레시 토큰이 전달되지 않았습니다.");
  }

  const tokenType = getTokenType(refreshToken);
  if (tokenType !== "REFRESH") {
    throw new HttpException(400, "리프레시 토큰이 아닙니다.");
  }

  const payload = verify(refreshToken);
  try {
    const identity = await prisma.user.findFirst({
      where: { systemId: payload.systemId },
      select: { systemId: true },
    });

    return res.json(createTokenFromId(identity.systemId));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      logger.warn("[refresh token] PrismaClientError", e);
      throw new HttpException(500, "서버 오류입니다.");
    }
    throw new HttpException(e.status, e.message);
  }
};
