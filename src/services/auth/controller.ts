import config from "@src/config";
import { Prisma } from "@prisma/client";
import { logger } from "@src/resources/logger";
import { HttpException } from "@src/exceptions";
import { OAuth2Client } from "google-auth-library";
import { createToken, prisma } from "@src/resources";

import type { User } from "@prisma/client";
import type { JWTType } from "@src/resources";
import type { Request, Response } from "express";
import type { GoogleLoginInfo } from "@src/interfaces";
import type { TokenPayload, LoginTicket } from "google-auth-library";

const googleOAuth2Client: OAuth2Client = new OAuth2Client();

export default async (
  req: Request,
  res: Response<{
    code?: string;
    token?: JWTType;
    message?: string;
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
      case "ERR_NOT_ALLOWED_EMAIL":
        return res
          .status(400)
          .json({ code, message: "우리학교 이메일로만 가입할 수 있어요." });

      default:
        return res.json({ token });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error("PrismaClientKnownRequestError:", e);
      throw new HttpException(500, "서버 오류입니다.");
    }

    throw new HttpException(e.status, e.message);
  }
};

const loginOrRegister = async ({
  hd,
  name,
  email,
  picture,
  sub: systemId,
}: TokenPayload): Promise<{
  code?: string;
  token?: JWTType;
}> => {
  const user: User = await prisma.user.findUnique({
    where: { systemId },
  });

  if (user) {
    const { paymentPin, systemId, deviceUid, bioKey } = user;

    if (!paymentPin) {
      return {
        token: createToken(systemId, "ERR_NO_PIN"),
      };
    }

    if (!deviceUid || !bioKey) {
      return {
        token: createToken(systemId, "ERR_USER_NO_KEYS"),
      };
    }

    return { token: createToken(systemId) };
  }

  if (hd !== "dimigo.hs.kr") {
    return { code: "ERR_NOT_ALLOWED_EMAIL" };
  }

  await prisma.user.create({
    data: {
      systemId,
      name: name,
      accountName: email,
      profileImage: picture,
    },
  });

  return { token: createToken(systemId, "ERR_REGISTERED") };
};
