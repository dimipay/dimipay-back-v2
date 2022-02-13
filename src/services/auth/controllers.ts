import { Request, Response } from "express";
import { User } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import {
  issue as issueToken,
  getTokenType,
  verify,
  prisma,
  getIdentity,
} from "@src/resources";
import { Account } from "@src/interfaces";

export const identifyUser = async (req: Request, res: Response) => {
  const body: Account = req.body;
  let isUnregistered = false;
  try {
    if (body.username == body.password) {
      throw {
        status: 400,
        message: "아이디와 비밀번호가 동일합니다.",
      };
    }
    const { apiData, status } = await getIdentity(body);
    if (status === 404) {
      throw new HttpException(403, "아이디 혹은 비밀번호가 올바르지 않습니다.");
    }

    if (status === 200) {
      const identify =
        (await (async () => {
          const a = await prisma.user.findUnique({
            where: { accountName: apiData.username },
          });
          if (a.studentNumber !== apiData.studentNumber) {
            return await prisma.user.update({
              where: { accountName: apiData.username },
              data: {
                studentNumber: apiData.studentNumber,
              },
            });
          } else {
            return a;
          }
        })()) ||
        (await (async () => {
          isUnregistered = true;
          return await prisma.user.create({
            data: {
              accountName: apiData.username,
              name: apiData.name,
              profileImage: apiData.photofile2,
              roles: apiData.user_type === "T" ? ["USER", "TEACHER"] : ["USER"],
              studentNumber: apiData.studentNumber,
              systemUid: apiData.id.toString(),
            },
          });
        })());

      return res.status(200).json({
        accessToken: await issueToken(identify, false),
        refreshToken: await issueToken(identify, true),
        isUnregistered,
      });
    }
  } catch (e) {
    if (e.status) {
      throw new HttpException(e.status, e.message);
    } else {
      throw new HttpException(400, "로그인할 수 없습니다.");
    }
  }
  //로그인 로직
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
  res.json({
    accessToken: await issueToken(identity, false),
    refreshToken: await issueToken(identity, true),
  });
};
