import winston from "winston";
import { notionLogger } from "./notion";

const { combine, timestamp, printf } = winston.format;

const logFormat = printf(
  (info) => `${info.timestamp} ${info.level}: ${info.message}`
);

const logger = winston.createLogger({
  format: combine(
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    logFormat
  ),
});

logger.add(
  new winston.transports.Console({
    level: "http",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
);

if (process.env.NODE_ENV === "prod") {
  logger.on("data", ({ level, message, timestamp: time }) => {
    notionLogger(level, message, new Date(time).toISOString());
  });
}

const httpLogStream = {
  write: (message: string) => {
    logger.http(message);
  },
};

export { logger, httpLogStream };
