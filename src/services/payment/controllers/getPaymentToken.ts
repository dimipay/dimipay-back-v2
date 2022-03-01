import { HttpException } from "@src/exceptions";
import { prisma, issueCustomToken } from "@src/resources";
import { Response, Request } from "express";
import { decryptPaymentToken, encrypt } from "dimipay-backend-crypto-engine";
import bcrypt from "bcrypt";

export const getApprovalToken = async (req: Request, res: Response) => {
  try {
    const { token: encryptedToken } = req.body;
    const { authMethod, ...token } = decryptPaymentToken(encryptedToken); //paymentToken은 Client에서 생성.

    if (authMethod === "PIN") {
      const user = await prisma.user.findUnique({
        where: { systemId: token.systemId },
        select: { paymentPin: true },
      });
      const { paymentPin } = user;
      if (!paymentPin)
        throw new HttpException(400, "PIN이 등록되지 않았습니다.");
      if (!bcrypt.compareSync(token.pin, paymentPin))
        throw new HttpException(400, "PIN이 올바르지 않습니다.");
    }

    return res.json({
      approvalToken: issueCustomToken(
        { a: [token.systemId, token.paymentMethod] },
        "3min"
      ),
    });
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
