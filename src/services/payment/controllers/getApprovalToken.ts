import { HttpException } from "@src/exceptions";
import { prisma, issueCustomToken, loadRedis, key } from "@src/resources";
import { Response, Request } from "express";
import { paymentToken } from "@src/resources";
import bcrypt from "bcrypt";
import { csprng } from "@src/resources";
import { dotcode } from "@src/resources/dotcode";
import SHA3 from "sha3";

export const getApprovalToken = async (req: Request, res: Response) => {
  try {
    const { token: encryptedToken } = req.body;
    const { authMethod, pin, ...token } = await paymentToken.decrypt(
      encryptedToken
    );

    if (authMethod === "PIN") {
      const user = await prisma.user.findUnique({
        where: { systemId: token.systemId },
        select: { paymentPin: true },
      });
      const { paymentPin } = user;
      if (!paymentPin)
        throw new HttpException(400, "PIN이 등록되지 않았습니다.");
      if (!bcrypt.compareSync(pin, paymentPin))
        throw new HttpException(400, "PIN이 올바르지 않습니다.");
    }

    const code = csprng().toString(16).padStart(8, "0");

    const hash = new SHA3(224);
    const redis = await loadRedis();
    const redisKey = key.approvalCode(
      hash.update(hash.update(code).digest("hex")).digest("hex")
    );
    await redis.set(redisKey, JSON.stringify(token));
    await redis.expire(redisKey, 64);

    const codeBuffer = await dotcode(code);
    res.setHeader("Content-Type", "image/png");
    return res.send(codeBuffer);
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
