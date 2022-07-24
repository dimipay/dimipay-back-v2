import fs from "fs";
import Joi from "joi";
import * as path from "path";
import {
  Router,
  RequestHandler,
  Request,
  Response,
  NextFunction,
} from "express";
import { join as pathJoin } from "path/posix";
import { HTTPMethod, ApiAuthType } from "../types";
import { checkPermissions, validator, attachIdentity } from "../middlewares";

interface KeyValue<T> {
  [key: string]: T;
}

export interface Route {
  method: HTTPMethod;
  description?: string;
  path: string;
  middlewares?: RequestHandler[];
  handler: RequestHandler;
  validateSchema?: KeyValue<Joi.Schema>;
  needAuth: boolean;
  permission?: ApiAuthType[];
}

// 임포트 된 서비스 (서비스 디렉토리 명 추가)
export interface Service {
  code?: string;
  name: string;
  baseURL: string;
  routes: Route[];
}

// 각 서비스 정의 시 사용되는 인터페이스
export interface ServiceSchema {
  name: string;
  baseURL: string;
  routes: Route[];
}

const wrapper =
  (asyncFn: any) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await asyncFn(req, res, next);
    } catch (error) {
      return next(error);
    }
  };

const createRouter = (services: Service[]) => {
  const router = Router();

  for (const { routes, baseURL, code } of services) {
    for (const route of routes) {
      router[route.method](pathJoin(baseURL, route.path), [
        wrapper(attachIdentity(code, route)),
        wrapper(checkPermissions(code, route)),
        ...(route.middlewares ? route.middlewares.map(wrapper) : []),
        ...(route.validateSchema
          ? [validator(Joi.object(route.validateSchema))]
          : []),
        wrapper(route.handler),
      ]);
    }
  }

  return router;
};

export const services = fs
  .readdirSync(__dirname, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const importedServices = services.map<Service>((name) => {
  return {
    code: name,
    ...require(path.join(__dirname, name)).default,
  };
});

export const serviceRouter = createRouter(importedServices);
