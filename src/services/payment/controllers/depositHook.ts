import { Response } from "express";
import { loadRedis } from "@src/resources";
import { HttpException } from "@src/exceptions";
import { ReqWithBody } from "@src/types";
import config from "@src/config";

interface DepositHook {
  date: string;
  time: string;
  targetAccount: string;
  memo: string;
  method: string;
  balance: number;
  amount: number;
}

export const depositHook = async (
  req: ReqWithBody<DepositHook>,
  res: Response
) => {
  const origin = req.get("origin");
  // if (!origin || origin.split(":")[0] !== config.depositOrigin) {
  //   throw new HttpException(403, "Invalid origin");
  // }
  try {
    const redis = await loadRedis();
    const redisKey = "deposit-hook";
    await redis.publish(redisKey, JSON.stringify(req.body));
    return res.sendStatus(200);
  } catch (e) {
    throw new HttpException(400, "오류가 발생했습니다.");
  }
};
