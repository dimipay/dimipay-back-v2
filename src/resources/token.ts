import jwt from "jsonwebtoken";
import config from "@src/config";
import { HttpException } from "@src/exceptions";
import { TokenType } from "../types";

export const getTokenType = async (token: string): Promise<TokenType> => {
  try {
    const payload: any = await jwt.verify(token, config.jwtSecret as string);
    return payload.refresh ? "REFRESH" : "ACCESS";
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new HttpException(418, "토큰이 만료되었습니다.");
    } else if (["jwt malformed", "invalid signature"].includes(error.message)) {
      throw new HttpException(401, "토큰이 변조되었습니다.");
    } else throw new HttpException(401, "토큰에 문제가 있습니다.");
  }
};

export const verify = async (
  token: string,
  jwtKey = config.jwtSecret as string
) => {
  try {
    const { identity }: any = await jwt.verify(token, jwtKey);
    return identity;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new HttpException(401, "토큰이 만료되었습니다.");
    } else if (["jwt malformed", "invalid signature"].includes(error.message)) {
      throw new HttpException(401, "토큰이 변조되었습니다.");
    } else throw new HttpException(401, "토큰에 문제가 있습니다.");
  }
};

export const verifyCustomToken = async (
  token: string,
  jwtKey = config.jwtSecret as string
) => {
  try {
    const payload: any = await jwt.verify(token, jwtKey);
    return payload;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new HttpException(401, "토큰이 만료되었습니다.");
    } else if (["jwt malformed", "invalid signature"].includes(error.message)) {
      throw new HttpException(401, "토큰이 변조되었습니다.");
    } else throw new HttpException(401, "토큰에 문제가 있습니다.");
  }
};

export const issueCustomToken = (
  payload: string | object | Buffer,
  expires?: string,
  jwtKey = config.jwtSecret as string
) => {
  return jwt.sign(payload, jwtKey, {
    algorithm: "HS512",
    expiresIn: expires,
  });
};

export const issue = async (
  identity: { systemId: string },
  refresh: boolean
) => {
  const token = await jwt.sign(
    {
      identity,
      refresh,
    },
    config.jwtSecret as string,
    {
      algorithm: "HS512",
      expiresIn: refresh ? "1y" : "1d",
    }
  );
  return token;
};
