import Joi from "joi";
import * as fs from "fs";
import * as path from "path";
import j2s from "joi-to-swagger";
import { prompt } from "enquirer";

import defaultSwaggerConfig from "./files/default-swagger.json";

import type { JsonObject } from "swagger-ui-express";
import type { Route, ServiceSchema } from "../src/services";

export default class {
  #docObject: JsonObject = { ...defaultSwaggerConfig };
  #SERIVCE_ROOT = path.join(__dirname, "../src/services");
  #services = fs.readdirSync(this.#SERIVCE_ROOT, {
    withFileTypes: true,
  });

  #serviceIterator = (fn: (service: ServiceSchema) => any): void => {
    for (const service of this.#services) {
      if (!service.isDirectory()) {
        continue;
      }

      const importPath: string = path.join(this.#SERIVCE_ROOT, service.name);
      const current: ServiceSchema = require(importPath).default;

      fn(current);
    }
  };

  #routerIterator = (current: ServiceSchema, fn: (router: Route) => any) => {
    for (const route of current.routes) {
      fn(route);
    }
  };

  #pathParser = (path: string) => {
    return {
      path: path.replace(/(:)([^\/]+)/g, "{$2}"),
      params: path.match(/(?<=:)([^\/]+)/g) || [],
    };
  };

  #readJson = (file: string) => {
    const filePath = path.join(__dirname, "files", file);
    if (!fs.existsSync(filePath)) {
      return { exists: false, data: {} };
    }
    return {
      exists: true,
      data: JSON.parse(fs.readFileSync(filePath, "utf8")),
    };
  };

  #writeJson = (file: string, data: any): void => {
    const filePath = path.join(__dirname, "files", file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  };

  public async generateResponseBase() {
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
    const { data: currentResposeObject } = this.#readJson("response.json");

    this.#serviceIterator((service) => {
      this.#routerIterator(service, (route) => {
        const { path } = this.#pathParser(service.baseURL + route.path);
        const existingPathObject = currentResposeObject[path] || {};
        const existingResponseObject = existingPathObject[route.method] || {};

        responseObject[path] = {
          [route.method]: {
            responses: { ...(existingResponseObject["responses"] || {}) },
          },
        };
      });
    });

    this.#writeJson("response.json", responseObject);
  }

  public generateSwagger() {
    this.#serviceIterator((service) => {
      this.#docObject["tags"].push({
        name: service.name,
      });

      this.#routerIterator(service, (route) => {
        // path params
        const parsedURL = this.#pathParser(service.baseURL + route.path);
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
        let responses: JsonObject | undefined;
        const { data: responseJson } = this.#readJson("response.json");
        const pathResponse = responseJson[parsedURL.path] || {};
        responses = pathResponse[route.method] || {};

        // combine every config
        this.#docObject["paths"][parsedURL.path] = {
          ...{
            [route.method]: {
              tags: [service.name],
              parameters: [...pathParams],
              requestBody,
              security,
              ...responses,
            },
          },
        };
      });
    });

    this.#writeJson("swagger.json", {
      ...this.#docObject,
      ...defaultSwaggerConfig,
    });
  }
}
