import { HttpException } from "@src/exceptions";
import { loadRedis, key, csprng } from "@src/resources";
import { Response, Request } from "express";
import { dotcode } from "@src/resources/dotcode";
import SHA3 from "sha3";

const issueCode = async (paymentMethod: string, systemId: string) => {
  const TIME_LIMIT = 60;
  const code = csprng().toString(16).padStart(8, "0");

  const hash = new SHA3(224);
  const redis = await loadRedis();
  const redisKey = key.approvalCode(
    hash.update(hash.update(code).digest("hex")).digest("hex")
  );
  await redis.set(
    redisKey,
    JSON.stringify({ paymentMethod, systemId: systemId })
  );
  await redis.expire(redisKey, TIME_LIMIT + 5);

  return {
    code,
    timeLimitSeconds: TIME_LIMIT,
    codeBuffer: (await dotcode(code)).toString("base64"),
  };
};

export const getApprovalCode = async (req: Request, res: Response) => {
  try {
    const { paymentMethod } = req.body;
    // res.setHeader("Content-Type", "image/png");
    return res.json(await issueCode(paymentMethod, req.user.systemId));
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};

export const refreshApprovalCode = async (req: Request, res: Response) => {
  try {
    const { code: approvalCode, paymentMethod } = req.body;

    const hash = new SHA3(224);
    const redis = await loadRedis();
    const redisKey = key.approvalCode(
      hash.update(hash.update(approvalCode).digest("hex")).digest("hex")
    );
    const redisValue = await redis.get(redisKey);
    redis.del(redisKey);

    if (!redisValue) {
      throw new HttpException(400, "유효하지 않거나 만료된 승인 코드입니다.");
    }

    const { systemId } = JSON.parse(redisValue);

    return res.json(await issueCode(paymentMethod, systemId));
  } catch (e) {}
};
