import express from "express";
import swaggerUi from "swagger-ui-express";

import swaggerJson from "./files/swagger.json";

export default class {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeRouter();
  }

  private initializeRouter() {
    this.app.use("/", swaggerUi.serve);
    this.app.get("/", swaggerUi.setup(swaggerJson));
  }

  public listen(port = 4023) {
    this.app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  }
}
