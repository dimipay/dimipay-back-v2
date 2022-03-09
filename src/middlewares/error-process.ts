import { HttpException } from "@src/exceptions";
import { logger } from "@src/resources";
import { NextFunction, Request, Response } from "express";

export const errorProcessingMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof HttpException) {
    return res.status(err.status).json({
      message: err.message,
      error: err.name,
    });
  }

  logger.error(`UNCATCHE_ERROR: ${err}`);

  res.status(500).json({
    message: "알 수 없는 오류가 발생했습니다",
  });
};
