import { HttpException } from "@src/exceptions";
import { prisma, issueCustomToken } from "@src/resources";
import { PaymentApprovalRequest } from "@src/interfaces";
import { Response, Request } from "express";
import { decryptPaymentToken, encrypt } from "dimipay-backend-crypto-engine";
import bcrypt from "bcrypt";

const transaction = () => {};

export const paymentApproval = async (req: Request, res: Response) => {
  try {
    const payment: PaymentApprovalRequest = req.body;

    const coupons = await prisma.coupon.findMany({
      orderBy: [{ amount: "desc" }],
      where: {
        id: { in: payment.couponIds },
      },
    });

    const couponAmount = coupons.reduce(
      (acc, coupon) => acc + coupon.amount,
      0
    );
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};

/*
결제 절차

1. 인증 타입 확인 (포스 인증, 모바일 인증으로 구분)
2. 쿠폰 확인
3. 결제 수단 확인 (페이머니, 빌링키 결제)
*/

/*
결제 case

1. 쿠폰 총량이 결제 금액보다 큰 경우 -> 전액 쿠폰 사용, 차액 페이머니 적립
2. 쿠폰 총량이 결제 금액보다 작은 경우 -> 쿠폰 사용, 차액 결제 수단에 맞춰 승인
*/
