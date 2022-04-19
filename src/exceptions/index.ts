import { TransactionStatus } from "@prisma/client";
import { logger } from "@src/resources";

export class HttpException extends Error {
  public status: number;
  public message: string;

  constructor(status = 500, message = "알 수 없는 서버 오류가 발생했습니다.") {
    super(message);
    this.name = "HttpException";
    this.status = status;
    this.message = message;

    logger.error(`${this.name}: ${this.status} ${this.message}`);
  }
}

export class TransactionException extends Error {
  public status: TransactionStatus;
  public message: string;

  constructor(status: TransactionStatus = "ERROR", message = "알 수 없는 거래 오류가 발생했습니다.") {
    super(message);
    this.name = "HttpException";
    this.status = status;
    this.message = message;

    logger.error(`${this.name}: ${this.status} ${this.message}`);
  }
}