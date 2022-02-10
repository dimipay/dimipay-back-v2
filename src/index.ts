import dotenv from "dotenv";
import App from "./app";
import config from "./config";
import { logger } from "@src/resources";

dotenv.config();

const { app } = new App();
const port: number = parseInt(config.port) || 5000;

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
