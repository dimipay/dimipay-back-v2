import bcrypt from "bcrypt";
import { prisma } from "@src/resources";
import { HttpException } from "@src/exceptions";
import { createTokensFromUser } from "./controllers";
import { OAuth2Client, TokenPayload } from "google-auth-library";

import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import type { GoogleLoginIngo } from "@src/interfaces";

const googleOAuth2Client: OAuth2Client = new OAuth2Client();

const registerOrLoginByGoogle = async (payload: TokenPayload) => {
  const userid = payload.aud;
  const queriedUser = await prisma.user.findUnique({
    where: { systemId: userid },
    select: {
      systemId: true,
      accountName: true,
      isDisabled: true,
      isTeacher: true,
      name: true,
      paymentMethods: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
      paymentPin: true,
      deviceUid: true,
    },
  });

  if (queriedUser) {
    if (queriedUser.paymentPin || queriedUser.deviceUid) {
      return { user: queriedUser, isFirstVisit: false };
    }
    // PIN, device 미등록 사용자
    return { user: queriedUser, isFirstVisit: true };
  }

  /**
   * @todo how to define accountName? (now it is email)
   *
   * @note In order to use email, name and picture,
   *       the request scope should include the string "profile"
   *       In this, I assumed that the request scope is "profile email"
   */
  const mappedUser: Prisma.UserCreateInput = {
    systemId: userid,
    accountName: payload.email,
    name: payload.name,
    profileImage: payload.picture,
  };

  const user = await prisma.user.create({
    data: mappedUser,
  });

  return { user, isFirstVisit: true };
};

export const googleIdentifyUser = async (req: Request, res: Response) => {
  const body: GoogleLoginIngo = req.body;

  try {
    // I temporarily disabled this because of testing
    /* // verify csrf token
    const csrfTokenCookie: string | undefined = req.cookies.g_csrf_token;
    if (!csrfTokenCookie) {
      throw new HttpException(400, "CSRF 토큰이 쿠키에 없습니다.");
    }
    const csrfTokenBody: string | undefined = req.body.g_csrf_token;
    if (!csrfTokenBody) {
      throw new HttpException(400, "CSRF 토큰이 전달되지 않았습니다.");
    }
    if (csrfTokenCookie !== csrfTokenBody) {
      throw new HttpException(400, "이중 제출 쿠키 인증에 실패했습니다.");
    } */

    /**
     * @todo check sub value(in google client id) to verify right client request
     */

    const payload = (
      await googleOAuth2Client.verifyIdToken({ idToken: body.credential })
    ).getPayload();

    const { user, isFirstVisit } = await registerOrLoginByGoogle(payload);

    // code down below is just a copy of main controller
    // but im gon fix this later
    if (isFirstVisit) {
      if (body.pin && body.deviceUid) {
        await prisma.user.update({
          where: { systemId: user.systemId },
          data: {
            paymentPin: bcrypt.hashSync(body.pin, 10),
            deviceUid: body.deviceUid,
            bioKey: bcrypt.hashSync(body.bioKey, 10),
          },
        });

        return res.json({ ...(await createTokensFromUser(user)) });
      } else {
        throw new HttpException(400, "신규 등록이 필요합니다.");
      }
    }

    if (bcrypt.compareSync(body.pin, user.paymentPin)) {
      if (body.deviceUid !== user.deviceUid) {
        // deviceUid 재설정
        await prisma.user.update({
          where: { systemId: user.systemId },
          data: {
            deviceUid: body.deviceUid,
            bioKey: bcrypt.hashSync(body.bioKey, 10),
          },
        });

        return res.json({ ...(await createTokensFromUser(user)) });
      } else {
        // 등록된 기기에서 재로그인하는 경우
        return res.json({ ...(await createTokensFromUser(user)) });
      }
    }

    throw new HttpException(400, "올바르지 않은 PIN입니다.");
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
