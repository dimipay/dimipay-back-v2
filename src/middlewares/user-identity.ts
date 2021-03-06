import { Request, Response, NextFunction, Router } from "express";
import { verify as veriToken, getTokenType } from "@src/resources";
import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Route, services } from "../services";

type ServiceName = typeof services[number];
export default (service: ServiceName | undefined, route: Route) =>
  async (req: Request, Res: Response, next: NextFunction) => {
    if (!req.token) {
      return next();
    } else if (!route.needAuth) {
      return next();
    }
    const { token } = req;
    try {
      if ((await getTokenType(token)) !== "ACCESS") {
        throw new HttpException(401, "액세스 토큰이 아닙니다.");
      }
      const identity = await veriToken(token);
      if (identity) {
        if (identity.isOnBoarding) {
          throw new HttpException(403, "아직 사용자 인증이 되지 않았습니다.");
        }
        if (identity.systemId) {
          req.user = await prisma.user.findFirst({
            where: { systemId: identity.systemId },
          });
        }
        if (req.user) {
          if (req.user.isDisabled) {
            throw new HttpException(401, "사용 중지된 계정입니다.");
          }
        } else {
          req.pos = await prisma.posDevice.findFirst({
            where: { systemId: identity.systemId },
          });
          if (req.pos) {
            if (req.pos.disabled) {
              throw new HttpException(401, "사용 중지된 POS입니다.");
            }
          } else {
            throw new HttpException(401, "잘못된 AccessToken입니다.");
          }
        }
      }
      return next();
    } catch (e) {
      return next(e);
    }
  };
