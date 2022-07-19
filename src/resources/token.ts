import jwt, { JwtPayload } from "jsonwebtoken";
import config from "@src/config";
import { HttpException } from "@src/exceptions";
import { TokenType } from "../types";

interface TokenPayload extends jwt.JwtPayload {
  identity: { systemId: string; onBoarding?: string };
  refresh: boolean;
}

export const issue = (
  identity: TokenPayload["identity"],
  refresh: boolean
): string => {
  return jwt.sign({ identity, refresh }, config.jwtSecret, {
    algorithm: "HS512",
    expiresIn: config.jwtLifeTime[refresh ? "refreshToken" : "accessToken"],
  });
};

export const issueCustomToken = (
  payload: Parameters<typeof jwt.sign>[0],
  expires?: jwt.SignOptions["expiresIn"],
  jwtKey = config.jwtSecret
): string => {
  return jwt.sign(payload, jwtKey, {
    algorithm: "HS512",
    expiresIn: expires,
  });
};

export const verify = (
  token: string,
  jwtKey = config.jwtSecret
): TokenPayload["identity"] => {
  try {
    const payload = jwt.verify(token, jwtKey) as TokenPayload;
    return payload.identity;
  } catch (error) {
    tokenErrorHandler(error, true);
  }
};

export const verifyCustomToken = <TPayload = any>(
  token: string,
  jwtKey = config.jwtSecret
): TPayload => {
  try {
    return jwt.verify(token, jwtKey) as TPayload;
  } catch (error) {
    tokenErrorHandler(error, true);
  }
};

export const getTokenType = (token: string): TokenType => {
  try {
    const { refresh } = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return refresh ? "REFRESH" : "ACCESS";
  } catch (error) {
    tokenErrorHandler(error, true);
  }
};

export const tokenErrorHandler = (error: Error, useDefault = false): void => {
  switch (error.name) {
    case "TokenExpiredError":
      throw new HttpException(401, "토큰이 만료되었습니다.");

    case "JsonWebTokenError":
      throw new HttpException(401, "유효하지 않은 토큰입니다.");
  }

  if (useDefault) {
    throw new HttpException(500, "서버 오류입니다.");
  }
};

export type JWTType = Record<"accessToken" | "refreshToken", string>;
export const createToken = (systemId: string, onBoarding?: string): JWTType => {
  return {
    accessToken: issue({ systemId, ...(onBoarding && { onBoarding }) }, false),
    refreshToken: issue({ systemId, ...(onBoarding && { onBoarding }) }, true),
  };
};

// this creates a token that can be used to change:
// - payment pin
// - device uid
// - bio key
export type TempTokenPayload = { tempId: string };
export const createTempToken = (systemId: string): string =>
  jwt.sign({ tempId: systemId }, config.jwtSecret, { expiresIn: "1h" });
