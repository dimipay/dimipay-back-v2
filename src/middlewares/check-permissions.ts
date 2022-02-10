import { NextFunction, Request, Response } from "express";
import { HttpException } from "../exceptions";
import { Route, services } from "../services";

type ServiceName = typeof services[number];
const checkPermissions =
  (service: ServiceName | undefined, route: Route) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!route.needAuth) return next(); // 인증이 필요없는 라우트일 경우 바이패스
    const userToken = req.token;

    // 인증이 필요한 라우트에 접근하는데 토큰이 없는 경우
    if (!userToken) {
      throw new HttpException(
        401,
        "액세스 토큰이 Authorization 헤더에 Bearer Token Type으로 전송되어야 합니다."
      );
    }

    // 관리자 권한이 필요한 라우트에 접근하는데 권한이 없는 경우
    // if (req.user?.userType !== "Administrator" && route.needPermission) {
    //   throw new HttpException(
    //     403,
    //     "해당 라우트에 접근하기 위해 필요한 권한이 없습니다."
    //   );
    // }

    // 모든 검사 통과
    return next();
  };

export default checkPermissions;
