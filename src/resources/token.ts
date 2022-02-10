import jwt from "jsonwebtoken";
import { User } from "../interfaces";
import config from "../config";
import { HttpException } from "../exceptions";

export const issueToken = async (identity: User) => {
  const token = await jwt.sign(
    {
      identity,
    },
    config.jwtSecret as string,
    {
      algorithm: "HS512",
      expiresIn: "1w",
    }
  );
  return token;
};

export const veriToken = async (token: string): Promise<User> => {
  try {
    const { identity }: any = await jwt.verify(
      token,
      config.jwtSecret as string
    );
    return identity;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new HttpException(401, "토큰이 만료되었습니다.");
    } else if (["jwt malformed", "invalid signature"].includes(error.message)) {
      throw new HttpException(401, "토큰이 변조되었습니다.");
    } else throw new HttpException(401, "토큰에 문제가 있습니다.");
  }
};
