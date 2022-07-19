import { HttpException } from "@src/exceptions";
import { verify, createToken, getTokenType } from "@src/resources";

import type { Request, Response } from "express";

export default async (req: Request, res: Response) => {
  const refreshToken = req.token;

  if (!refreshToken) {
    throw new HttpException(400, "리프레시 토큰이 전달되지 않았습니다.");
  }

  const tokenType = getTokenType(refreshToken);
  if (tokenType !== "REFRESH") {
    throw new HttpException(400, "리프레시 토큰이 아닙니다.");
  }

  const { systemId, isOnBoarding } = verify(refreshToken);
  return res.json(createToken(systemId, isOnBoarding));
};
