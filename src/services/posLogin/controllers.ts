import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import {
  issue as issueToken,
  getTokenType,
  verify,
  key,
  loadRedis,
  prisma,
} from "@src/resources";
import bcrypt from "bcrypt";
import { PosDevice } from "@prisma/client";

const createTokens = async (pos: Partial<PosDevice>) => {
  const { id } = pos;
  return {
    accessToken: await issueToken({ id }, false),
    refreshToken: await issueToken({ id }, true),
  };
};

export const createPosTokenFromKey = async (req: Request, res: Response) => {
  try {
    const { authKey } = req.body;
    const redisKey = "reg_pos";

    const redis = await loadRedis();
    const [posId, keyHash] = await (await redis.get(redisKey)).split(":");
    const pos = await prisma.posDevice.findFirst({ where: { id: posId } });

    if (!bcrypt.compare(authKey, keyHash)) {
      throw new HttpException(400, "로그인에 실패했습니다.");
    } else if (!pos) {
      throw new HttpException(400, "등록되지 않은 단말기입니다.");
    }
    res.json(await createTokens(pos));
  } catch (e) {}
};

export const refreshPosToken = async (req: Request, res: Response) => {
  try {
    const { token: refreshToken } = req;
    if (!refreshToken) {
      throw new HttpException(400, "리프레시 토큰이 전달되지 않았습니다.");
    }

    const tokenType = await getTokenType(refreshToken);
    if (tokenType !== "REFRESH") {
      throw new HttpException(400, "리프레시 토큰이 아닙니다.");
    }
    const payload = await verify(refreshToken);
    const identity = await prisma.user.findUnique({
      where: { id: payload.id },
    });
    return res.json(await createTokens(identity));
  } catch (e) {}
};
