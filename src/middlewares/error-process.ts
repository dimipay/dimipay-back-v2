import { HttpException } from "@src/exceptions";
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

  res.status(500).json({
    message: "알 수 없는 오류가 발생했어요",
  });
};