import { HttpException } from "@src/exceptions";
import { prisma, loadRedis, key, csprng, verify } from "@src/resources";
import { Response, Request } from "express";
import bcrypt from "bcrypt";
import { dotcode } from "@src/resources/dotcode";
import SHA3 from "sha3";

export const getApprovalCode = async (req: Request, res: Response) => {
  try {
    const { authMethod, paymentMethod } = req.body;

    const code = csprng().toString(16).padStart(8, "0");

    const hash = new SHA3(224);
    const redis = await loadRedis();
    const redisKey = key.approvalCode(
      hash.update(hash.update(code).digest("hex")).digest("hex")
    );
    await redis.set(
      redisKey,
      JSON.stringify({ paymentMethod, authMethod, systemId: req.user.systemId })
    );
    await redis.expire(redisKey, 64);

    const codeBuffer = await dotcode(code);
    res.setHeader("Content-Type", "image/png");
    return res.send(codeBuffer);
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
