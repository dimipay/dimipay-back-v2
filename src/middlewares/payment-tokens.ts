import { Request, Response, NextFunction } from "express";
import { HttpException } from "@src/exceptions";
import bcrypt from "bcrypt";
import { verifyCustomToken } from "@src/resources";
import { GeneralPaymentToken, SpecialPaymentToken } from "@src/interfaces";

export default async (req: Request, res: Response, next: NextFunction) => {
  const { token: encryptedToken } = req.body;
  const { pin, bioKey, ...token } = (await verifyCustomToken(
    encryptedToken,
    req.user.deviceUid
  )) as GeneralPaymentToken | SpecialPaymentToken;
  req.body = token;

  if (pin) {
    if (!bcrypt.compareSync(pin, req.user.paymentPin))
      throw new HttpException(400, "올바르지 않은 결제 비밀번호입니다.");
  } else if (bioKey) {
    if (!bcrypt.compareSync(bioKey, req.user.bioKey))
      throw new HttpException(400, "올바르지 않은 결제 요청입니다.");
  } else {
    throw new HttpException(400, "올바르지 않은 결제 요청입니다.");
  }
  next();
};
