import { ReqWithBody } from "@src/types";
import { HttpException } from "@src/exceptions";
import { ApprovalOrder, ApprovalUserIdentity } from "@src/interfaces";
import { TransactionMethod } from "@prisma/client";
import config from "@src/config";
import { loadRedis, key } from "@src/resources";
import { Response } from "express";

export const stageProducts = async (
  req: ReqWithBody<ApprovalOrder>,
  res: Response
) => {
  try {
    //여기서 실 승인
    const { products } = req.body;
    const userIdentity = req.body.userIdentity
      ? req.body.userIdentity
      : ({
          systemId: config.defaultApproval.paymentMethod,
          paymentMethod: config.defaultApproval.paymentMethod,
          transactionMethod: "APP_QR" as TransactionMethod,
        } as ApprovalUserIdentity);

    const redis = await loadRedis();
    const redisKey = key.stageProducts(req.pos.systemId);
    await redis.set(redisKey, JSON.stringify({ products, userIdentity }));
    return res.status(200).send();
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
