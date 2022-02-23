import fs from "fs";
import Joi from "joi";
import {
  Router,
  RequestHandler,
  Request,
  Response,
  NextFunction,
} from "express";
import j2s from "joi-to-swagger";
import { join as pathJoin } from "path";
import { HTTPMethod, ApiAuthType } from "../types";
import { checkPermissions, validator } from "../middlewares";
import swaggerUi from "swagger-ui-express";
import defaultSwagger from "@src/resources/swagger/default-swagger.json";

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
interface ServiceSchema {
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

export const createService = (serviceSchema: ServiceSchema): ServiceSchema =>
  serviceSchema;

const createRouter = (services: Service[]) => {
  const router = Router();

  services.forEach((service) => {
    service.routes.forEach((route) => {
      router[route.method](
        pathJoin(service.baseURL, route.path),
        ...(route.middlewares ? route.middlewares.map(wrapper) : []),
        wrapper(checkPermissions(service.code, route)),
        ...(route.validateSchema
          ? [validator(Joi.object(route.validateSchema))]
          : []),
        wrapper(route.handler)
      );
    });
  });

  return router;
};

const createDocsObject = (services: Service[]) => {
  // const schemaMapper = (validateSchema: KeyValue<Joi.AnySchema>) => {
  //   const keys = Object.keys(validateSchema);
  //   const result: KeyValue<String | undefined> = {};
  //   keys.forEach((key) => {
  //     result[key] = validateSchema[key].type;
  //   });
  //   return result;
  // };
  const routeMapper = (service: Service) =>
    service.routes.map((r) => ({
      ...r,
      path: (service.baseURL + r.path).replace(/\/$/, ""),
      validateSchema: r.validateSchema
        ? j2s(Joi.object().keys(r.validateSchema)).swagger
        : null,
    }));

  const mappedServices = services.map((s: Service) => ({
    ...s,
    routes: routeMapper(s),
  }));

  return mappedServices;
};

const createDocsRouter = (services: Service[]) => {
  const router = Router();
  router.get("/", (req, res) => {
    res.json(createDocsObject(services));
  });

  return router;
};

export const services = fs
  .readdirSync(__dirname)
  .filter((s) => !s.startsWith("index"));

export const importedServices: Service[] = services.map((s: string) => ({
  code: s,
  // eslint-disable-next-line
  ...require(`${__dirname}/${s}`).default,
}));

const createSwaggerDocs = (services: Service[]) => {
  const mappedTags = services.map((s: any) => ({
    name: s.code,
    description: s.name,
  }));

  const pathMapper = (path: string) => {
    let mappedPath = "";
    let params: string[] = [];
    path
      .substring(1)
      .split("/")
      .forEach((p) => {
        if (p.startsWith(":")) {
          mappedPath = mappedPath + `/{${p.substring(1)}}`;
          params.push(p.substring(1));
        } else {
          mappedPath = mappedPath + `/${p}`;
        }
      });
    return { mappedPath, params };
  };

  const mappedPaths: KeyValue<any> = {};
  services.forEach((service: Service) => {
    service.routes.forEach((route: Route) => {
      mappedPaths[service.baseURL + pathMapper(route.path).mappedPath] = {};
    });
    service.routes.forEach((route: any) => {
      mappedPaths[service.baseURL + pathMapper(route.path).mappedPath][
        route.method
      ] = {
        tags: [service.code],
        summary: route.summery,
      };
      if (route.validateSchema) {
        mappedPaths[service.baseURL + pathMapper(route.path).mappedPath][
          route.method
        ].requestBody = {
          content: {
            "application/json": {
              schema: j2s(Joi.object().keys(route.validateSchema)).swagger,
            },
          },
        };
      }
      if (pathMapper(route.path).params.length) {
        const params: object[] = [];
        pathMapper(route.path).params.forEach((p) => {
          params.push({
            name: p,
            in: "path",
            required: true,
          });
        });
        mappedPaths[service.baseURL + pathMapper(route.path).mappedPath][
          route.method
        ].parameters = params;
      }
    });
  });
  return { tags: mappedTags, paths: mappedPaths };
};

export const createSwaggerUi = () => {
  const router = Router();
  router.get("/swagger.json", wrapper(getSwaggerJson));
  const options = {
    swaggerOptions: {
      url: "/api-docs/swagger.json",
    },
  };
  router.use(
    "/",
    swaggerUi.serveFiles(undefined, options),
    swaggerUi.setup(undefined, options)
  );

  return router;
};

const getSwaggerJson = async (req: Request, res: Response) => {
  const swagger = {
    ...defaultSwagger,
    ...createSwaggerDocs(importedServices),
  };
  // console.log(swagger);
  return res.json(swagger);
};

export const serviceSwaggerUi = createSwaggerUi();
export const serviceRouter = createRouter(importedServices);
export const serviceDocsRouter = createDocsRouter(importedServices);
