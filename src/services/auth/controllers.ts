import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import {
  issue as issueToken,
  getTokenType,
  verify,
  prisma,
  getIdentity,
} from "@src/resources";
import { LoginInfo } from "@src/interfaces";
import { Prisma, User } from "@prisma/client";

const createTokensFromUser = async (user: Partial<User>) => {
  return {
    accessToken: await issueToken(user, false),
    refreshToken: await issueToken(user, true),
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
      profileImage: apiData.photofile2 || apiData.photofile1,
      studentNumber: apiData.studentNumber,
      systemId: apiData.id.toString(),
      isTeacher: ["D", "T"].includes(apiData.user_type),
    };

    const queriedUser = await prisma.user.findFirst({
      where: { systemId: mappedUser.systemId },
      select: {
        accountName: true,
        isDisabled: true,
        isTeacher: true,
        name: true,
        paymentMethods: true,
        profileImage: true,
      },
    });
    if (queriedUser) {
      if (queriedUser.paymentMethods.length)
        return res.json(await createTokensFromUser(queriedUser));

      return res.status(201).json({
        ...(await createTokensFromUser(queriedUser)),
        isFirstVisit: true,
      });
    }

    const user = await prisma.user.create({
      data: mappedUser,
    });

    return res.status(201).json({
      ...(await createTokensFromUser(user)),
      isFirstVisit: true,
    });
  } catch (e) {
    if (e.status) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e.status, e.message);
    }
    console.log(e);
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
