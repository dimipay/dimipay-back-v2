import express, { NextFunction, Request, Response } from "express";
import bearerToken from "express-bearer-token";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import { httpLogStream } from "@src/resources";
import { serviceDocsRouter, serviceRouter, serviceSwaggerUi } from "./services";
import { attachIdentity, errorProcessingMiddleware } from "./middlewares";

class App {
  public app: express.Application;
  constructor() {
    this.app = express();
    this.initializeMiddlewares(); // initialize middlewares
    this.initializeMorgan(); // initialize morgan
    this.initializeRouter(); // initialize router
    this.errorProcessingMiddleware(); // error processing middleware
  }
  private initializeRouter() {
    this.app.use("/", serviceRouter);
    this.app.use("/docs", serviceDocsRouter);
    this.app.use("/api-docs", serviceSwaggerUi);
  }
  private errorProcessingMiddleware() {
    this.app.use(errorProcessingMiddleware);
  }
  private initializeMiddlewares() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json()); // for parsing application/json
    this.app.use(
      bearerToken({
        headerKey: "Bearer",
        reqKey: "token",
      })
    );
    this.app.use(attachIdentity);
  }
  private initializeMorgan() {
    this.app.use(
      morgan(
        (tokens, req, res) => {
          return [
            `HTTP/${tokens["http-version"](req, res)}`,
            tokens.method(req, res),
            req.headers["x-forwarded-for"] || req.ip,
            tokens.url(req, res),
            tokens["remote-user"](req, res),
            tokens.status(req, res),
            `USER/${req.user.id}`,
            tokens["user-agent"](req, res),
            `${tokens["response-time"](req, res)} ms`,
          ].join(" ");
        },
        { stream: httpLogStream }
      )
    );
  }
}
export default App;
