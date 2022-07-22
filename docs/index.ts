import Joi from "joi";
import * as fs from "fs";
import * as path from "path";
import j2s from "joi-to-swagger";
import { prompt } from "enquirer";

import responseJson from "./files/response.json";
import defaultSwaggerConfig from "./files/default-swagger.json";

import type { JsonObject } from "swagger-ui-express";
import type { ServiceSchema } from "../src/services";

const SERIVCE_ROOT: string = path.join(__dirname, "../src/services");

const docObject: JsonObject = { ...defaultSwaggerConfig };
const services: fs.Dirent[] = fs.readdirSync(SERIVCE_ROOT, {
  withFileTypes: true,
});

const pathParser = (path: string): { path: string; params: string[] } => {
  return {
    path: path.replace(/(:)([^\/]+)/g, "{$2}"),
    params: path.match(/(?<=:)([^\/]+)/g) || [],
  };
};

export const generateResponseBase = async () => {
  if (fs.existsSync(path.join(__dirname, "./files/response.json"))) {
    const { overwrite } = await prompt<{ overwrite: boolean }>({
      type: "confirm",
      name: "overwrite",
      message: "response.json already exists. Overwrite?",
    });

    if (!overwrite) {
      console.log("Aborting...");
      return;
    }
  }

  const responseObject = {};

  for (const service of services) {
    if (!service.isDirectory()) {
      continue;
    }

    const importPath: string = path.join(SERIVCE_ROOT, service.name);
    const current: ServiceSchema = require(importPath).default;

    for (const route of current.routes) {
      const { path: parsedPath } = pathParser(current.baseURL + route.path);

      responseObject[parsedPath] = {
        [route.method]: {
          response: {},
        },
      };
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "files/response.json"),
    JSON.stringify(responseObject, null, 2)
  );
};

export const generateSwagger = () => {
  for (const service of services) {
    if (!service.isDirectory()) {
      continue;
    }

    const importPath: string = path.join(SERIVCE_ROOT, service.name);
    const current: ServiceSchema = require(importPath).default;

    docObject["tags"].push({
      name: current.name,
    });

    for (const route of current.routes) {
      // path params
      const parsedURL = pathParser(current.baseURL + route.path);
      const pathParams = parsedURL.params.map((param) => {
        return {
          in: "path",
          name: param,
          required: true,
        };
      });

      // request body
      let requestBody: JsonObject | undefined;
      if (route.validateSchema) {
        requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: j2s(Joi.object().keys(route.validateSchema)).swagger,
            },
          },
        };
      }

      // auth
      let security: [{ bearerAuth: [] }] | undefined;
      if (route.needAuth) {
        security = [{ bearerAuth: [] }];
      }

      // response
      const responses = responseJson[parsedURL.path];

      // combine every config
      docObject["paths"][parsedURL.path] = {
        ...{
          [route.method]: {
            tags: [current.name],
            parameters: [...pathParams],
            requestBody,
            security,
            responses,
          },
        },
      };
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "files/swagger.json"),
    JSON.stringify({ ...docObject, ...defaultSwaggerConfig }, null, 2)
  );
};
