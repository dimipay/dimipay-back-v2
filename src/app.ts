import express, { NextFunction, Request, Response } from "express";
import bearerToken from "express-bearer-token";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import { httpLogStream } from "@src/resources";
import { serviceDocsRouter, serviceRouter, serviceSwaggerUi } from "./services";
import { attachIdentity } from "./middlewares";
import { HttpException } from "./exceptions";

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
    this.app.use(
      "/",
      (err: unknown, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof HttpException) {
          return res.status(err.status).json({
            message: err.message,
            error: err.name,
          });
        }

        res.status(500).json({
          message: "알 수 없는 오류가 발생했어요",
        });
      }
    );
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
    const morganFormat = `HTTP/:http-version :method :remote-addr 
      :url :remote-user :status :res[content-length] 
      :referrer :user-agent :response-time ms`;

    this.app.use(morgan(morganFormat, { stream: httpLogStream }));
  }
}
export default App;
