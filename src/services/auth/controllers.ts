import { Request, Response } from "express";
import { User, PaymentMethod, Prisma } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import {
  issue as issueToken,
  getTokenType,
  verify,
  prisma,
  getIdentity,
} from "@src/resources";
import { LoginInfo } from "@src/interfaces";

const createTokensFromUser = async (user: User) => {
  return {
    accessToken: issueToken(user, false),
    refreshToken: issueToken(user, true),
  };
};

export const identifyUser = async (req: Request, res: Response) => {
  const body: LoginInfo = req.body;
  try {
    if (body.username == body.password) {
      throw new HttpException(400, "아이디와 비밀번호가 동일합니다.");
    }

    const { apiData, status } = await getIdentity(body);

    if (status !== 200 || !apiData) {
      throw new HttpException(403, "아이디 혹은 비밀번호가 올바르지 않습니다.");
    }

    const mappedUser: Prisma.UserCreateInput = {
      accountName: apiData.username,
      name: apiData.name,
      profileImage: apiData.photofile2,
      studentNumber: apiData.studentNumber,
      systemId: apiData.id.toString(),
      isTeacher: ["D", "T"].includes(apiData.user_type),
    };

    // update if exist else create (update / insert)
    const user = await prisma.user.upsert({
      where: { systemId: mappedUser.systemId },
      include: { paymentMethods: true },
      update: mappedUser,
      create: mappedUser,
    });

    if (user.paymentMethods.length)
      return res.json(await createTokensFromUser(user));

    return res.status(201).json({
      ...(await createTokensFromUser(user)),
      isFirstVisit: true,
    });
  } catch (e) {
    if (e.status) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e.status, e.message);
    }
    throw new HttpException(400, "로그인할 수 없습니다.");
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const { token: refreshToken } = req;
  if (!refreshToken)
    throw new HttpException(400, "리프레시 토큰이 전달되지 않았습니다.");

  const tokenType = await getTokenType(refreshToken);
  if (tokenType !== "REFRESH")
    throw new HttpException(400, "리프레시 토큰이 아닙니다.");

  const payload = await verify(refreshToken);
  const identity = await prisma.user.findUnique({ where: { id: payload.id } });
  res.json(await createTokensFromUser(identity));
};
