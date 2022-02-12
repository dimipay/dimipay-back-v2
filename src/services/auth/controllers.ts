import { Request, Response } from "express";
import { User } from "@prisma/client";
import { HttpException } from "@src/exceptions";
import { issue as issueToken, prisma, getIdentity } from "@src/resources";
import { Account } from "@src/interfaces";

export const identifyUser = async (req: Request, res: Response) => {
  const body: Account = req.body;
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
        (await prisma.user.findUnique({
          where: { accountName: apiData.username },
        })) ||
        (await prisma.user.create({
          data: {
            accountName: apiData.username,
            name: apiData.name,
            profileImage: apiData.photofile2,
            roles: apiData.user_type === "T" ? ["USER", "TEACHER"] : ["USER"],
            studentNumber: apiData.studentNumber,
            systemUid: apiData.id.toString(),
          },
        }));

      return res.status(200).json({
        accessToken: await issueToken(identify, false),
        refreshToken: await issueToken(identify, true),
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
  //토큰 재발급 로직
};
