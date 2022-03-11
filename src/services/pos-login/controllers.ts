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
    const { passcode } = req.body;
    const redisKey = "reg_pos";

    const redis = await loadRedis();
    const registrationKey = await redis.get(redisKey);

    if (!registrationKey) {
      throw new HttpException(400, "로그인에 실패했습니다");
    }

    const [posId, keyHash] = registrationKey.split(":");
    const pos = await prisma.posDevice.findFirst({ where: { id: posId } });

    if (!bcrypt.compare(passcode, keyHash)) {
      throw new HttpException(400, "로그인에 실패했습니다.");
    }
    if (!pos) {
      throw new HttpException(400, "등록되지 않은 단말기입니다");
    }
    if (pos.disabled) {
      throw new HttpException(400, "사용이 중지된 단말기입니다");
    }
    res.json({
      ...(await createTokens(pos)),
      posName: pos.name,
    });
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
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
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
