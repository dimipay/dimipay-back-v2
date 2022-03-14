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
  const { id, systemId } = user;
  return {
    accessToken: await issueToken({ id, systemId }, false),
    refreshToken: await issueToken({ id, systemId }, true),
  };
};

export const identifyUser = async (req: Request, res: Response) => {
  const body: LoginInfo = req.body;
  try {
    const { apiData, status } = await getIdentity(body);
    if (body.username == body.password) {
      throw new HttpException(400, "아이디와 비밀번호가 동일합니다.");
    }
    const mappedUser: Prisma.UserCreateInput = {
      accountName: apiData.username,
      name: apiData.name,
      profileImage: apiData.photofile2 || apiData.photofile1,
      studentNumber: apiData.studentNumber,
      systemId: apiData.id.toString(),
      isTeacher: ["D", "T"].includes(apiData.user_type),
      phoneNumber: apiData.phone
        ? apiData.phone.startsWith("01")
          ? "+82 " + apiData.phone.slice(1)
          : null
        : null,
    };

    const queriedUser = await prisma.user.findFirst({
      where: { systemId: mappedUser.systemId },
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
      },
    });
    if (queriedUser) {
      if (queriedUser.paymentMethods.length)
        return res.json(await createTokensFromUser(queriedUser));
      if (queriedUser.paymentPin)
        return res.json(await createTokensFromUser(queriedUser));

      // Payment method 미등록 사용자
      return res.status(201).json({
        ...(await createTokensFromUser(queriedUser)),
        isFirstVisit: true,
      });
    }

    const user = await prisma.user.create({
      data: mappedUser,
    });

    // 최초 등록 사용자
    return res.status(201).json({
      ...(await createTokensFromUser(user)),
      isFirstVisit: true,
    });
  } catch (e) {
    throw new HttpException(e.status, e.message);
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
  return res.json(await createTokensFromUser(identity));
};
