import config from "@src/config";
import { logger } from "@src/resources/logger";
import { HttpException } from "@src/exceptions";
import { OAuth2Client } from "google-auth-library";
import { createToken, prisma } from "@src/resources";

import type { Response } from "express";
import type { ReqWithBody } from "@src/types";
import type { JWTType } from "@src/resources";
import type { GoogleLoginInfo } from "@src/interfaces";
import type { TokenPayload } from "google-auth-library";

const googleOAuth2Client: OAuth2Client = new OAuth2Client();

export default async (req: ReqWithBody<GoogleLoginInfo>, res: Response) => {
  try {
    const payload = await getPayload(req.body.idToken);
    const { code, response } = await loginOrRegister(payload);

    if (code === "ERR_NOT_ALLOWED_EMAIL") {
      return res.status(400).json({
        code,
        message: "우리학교 이메일로만 가입할 수 있습니다.",
      });
    }

    return res.json(response);
  } catch (e) {
    logger.error("[login] unpredicted error: ", e);
    throw new HttpException(500, "서버 오류입니다.");
  }
};

const getPayload = async (idToken: string): Promise<TokenPayload> => {
  return (
    await googleOAuth2Client.verifyIdToken({
      idToken,
      audience: config.googleClientIds,
    })
  ).getPayload();
};

const loginOrRegister = async (
  payload: TokenPayload
): Promise<{ code?: string; response?: object }> => {
  const user = await prisma.user.findUnique({
    where: { systemId: payload.sub },
    select: { paymentPin: true, systemId: true },
  });

  if (user) {
    const { paymentPin, systemId } = user;

    // isOnBoarding: true, isFirstVisit: false
    if (!paymentPin) {
      return {
        response: {
          isFirstVisit: true,
          ...createToken(systemId, true),
        },
      };
    }

    // isOnBoarding: false, isFirstVisit: false
    return {
      response: {
        isFirstVisit: false,
        ...createToken(systemId, true),
      },
    };
  }

  if (payload.hd !== "dimigo.hs.kr") {
    return { code: "ERR_NOT_ALLOWED_EMAIL" };
  }

  await prisma.user.create({
    data: {
      name: payload.name,
      systemId: payload.sub,
      accountName: payload.email,
      profileImage: payload.picture,
    },
  });

  // isOnBoarding: true, isFirstVisit: true
  return {
    response: {
      isFirstVisit: true,
      ...createToken(payload.sub, true),
    },
  };
};
