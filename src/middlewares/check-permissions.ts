import { NextFunction, Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import { Route, services } from "../services";

type ServiceName = typeof services[number];
const checkPermissions =
  (service: ServiceName | undefined, route: Route) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (route.needAuth === undefined || route.needAuth === true) {
      const userToken = req.token;

      // 인증이 필요한 라우트에 접근하는데 토큰이 없는 경우
      if (!userToken) {
        throw new HttpException(
          401,
          "액세스 토큰이 Authorization 헤더에 Bearer Token Type으로 전송되어야 합니다."
        );
      }

      if (!route.permission) {
        return next();
      } else if (route.permission.includes("Pos") && !req.user && req.pos) {
        return next();
      } else if (route.permission.includes("Student") && !req.user.isTeacher) {
        return next();
      } else if (route.permission.includes("Teacher") && req.user.isTeacher) {
        return next();
      } else {
        throw new HttpException(
          403,
          "해당 라우트에 접근하기 위해 필요한 권한이 없습니다."
        );
      }
    }
    if (!route.needAuth) {
      return next(); // 인증이 필요없는 라우트일 경우 바이패스
    }
  };

export default checkPermissions;
