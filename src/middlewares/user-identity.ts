import { Request, Response, NextFunction } from "express";
import { verify as veriToken, getTokenType } from "@src/resources";
import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";

const attachIdentity = async (
  req: Request,
  Res: Response,
  next: NextFunction
) => {
  if (!req.token) {
    return next();
  }
  const { token } = req;
  try {
    if ((await getTokenType(token)) !== "ACCESS") {
      throw new HttpException(401, "액세스 토큰이 아닙니다.");
    }
    const identity = await veriToken(token);
    if (identity) {
      if (identity.systemId) {
        req.user = await prisma.user.findFirst({
          where: { systemId: identity.systemId },
        });
      if (req.user.isDisabled)
        throw new HttpException(401, "사용 중지된 계정입니다.");
      else
        req.pos = await prisma.posDevice.findFirst({
          where: { id: identity.id },
        });
    }
    return next();
  } catch (e) {
    return next(e);
  }
};

export default attachIdentity;
