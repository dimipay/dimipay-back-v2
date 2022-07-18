import config from "@src/config";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { logger } from "@src/resources/logger";
import { HttpException } from "@src/exceptions";
import { OAuth2Client } from "google-auth-library";
import { createTokenFromId } from "@src/resources";
import { prisma, createTempToken } from "@src/resources";

import type { User } from "@prisma/client";
import type { Request, Response } from "express";
import type { GoogleLoginInfo } from "@src/interfaces";
import type { TokenPayload, LoginTicket } from "google-auth-library";

const googleOAuth2Client: OAuth2Client = new OAuth2Client();

type Code =
  | "OK"
  | "ERR_REGISTERED"
  | "ERR_NO_PIN"
  | "ERR_NO_UID"
  | "ERR_NO_BIOKEY";

export default async (
  req: Request,
  res: Response<{
    code: Code;
    message?: string;
    token: string | ReturnType<typeof createTokenFromId>;
  }>
) => {
  const body: GoogleLoginInfo = req.body;

  try {
    const ticket: LoginTicket = await googleOAuth2Client.verifyIdToken({
      idToken: body.idToken,
      audience: config.googleClientIds,
    });
    const payload: TokenPayload = ticket.getPayload();

    const { code, token } = await loginOrRegister(payload);

    switch (code) {
      case "OK":
        return res.json({ code, token });

      case "ERR_REGISTERED":
        return res.json({
          code,
          message: "사용자가 추가되었습니다. PIN을 등록해주세요.",
          token: createTempToken(payload.sub),
        });

      case "ERR_NO_PIN":
        return res.status(403).json({
          code,
          message: "결제 PIN을 등록해주세요.",
          token: createTempToken(payload.sub),
        });

      case "ERR_NO_UID":
        return res.status(401).json({
          code: "ERR_REGISTERED",
          message: "deviceUid를 등록해주세요.",
          token: createTempToken(payload.sub),
        });

      case "ERR_NO_BIOKEY":
        return res.status(401).json({
          code: "ERR_REGISTERED",
          message: "bioKey를 등록해주세요.",
          token: createTempToken(payload.sub),
        });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error("PrismaClientKnownRequestError:", e);
      throw new HttpException(500, "서버 오류입니다.");
    }

    throw new HttpException(e.status, e.message);
  }
};

const loginOrRegister = async (
  payload: TokenPayload
): Promise<{
  code: Code;
  token?: Awaited<ReturnType<typeof createTokenFromId>>;
}> => {
  const user: User = await prisma.user.findUnique({
    where: { systemId: payload.sub },
  });

  if (user) {
    if (!user.paymentPin) {
      return { code: "ERR_NO_PIN" };
    }

    if (!user.deviceUid) {
      return { code: "ERR_NO_UID" };
    }

    if (!user.bioKey) {
      return { code: "ERR_NO_BIOKEY" };
    }

    return {
      code: "OK",
      token: createTokenFromId(user.systemId),
    };
  }

  await prisma.user.create({
    data: {
      accountName: payload.name + " - " + randomBytes(2).toString("hex"),
      name: payload.name,
      systemId: payload.sub,
      profileImage: payload.picture,
    },
  });

  return { code: "ERR_REGISTERED" };
};
