import { HttpException } from "@src/exceptions";
import { prisma, issueCustomToken } from "@src/resources";
import { Response, Request } from "express";
import { decryptPaymentToken, encrypt } from "dimipay-backend-crypto-engine";
import bcrypt from "bcrypt";

export const paymentApproval = async (req: Request, res: Response) => {
  try {
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
