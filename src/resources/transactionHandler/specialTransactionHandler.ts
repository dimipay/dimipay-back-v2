import { TransactionStatus } from "@prisma/client";
import { prisma, loadRedis, key } from "@src/resources";
import { ApprovalUserIdentity, SpecialPurchase } from "@src/interfaces";
import { TransactionException, HttpException } from "@src/exceptions";
import { couponProcess } from "./common";
import { approveTransaction } from "./common";

export const specialPurchaseTransaction = async (
  userIdentity: ApprovalUserIdentity,
  totalPrice: number,
  products: SpecialPurchase,
  hasCoupons = true
) => {
  const user = await prisma.user.findFirst({
    where: {
      systemId: userIdentity.systemId,
    },
  });

  const redis = await loadRedis();
  const redisKey = key.approvalResponse(user.id);

  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: {
      systemId: userIdentity.paymentMethod,
    },
    include: {
      generalCard: true,
      prepaidCard: true,
    },
  });
  if (!paymentMethod) {
    throw new TransactionException("CANCELED", "잘못된 결제 수단입니다.");
  }

  try {
    if (userIdentity.transactionMethod == "INAPP" && products.pos) {
      throw new TransactionException("CANCELED", "비정상적인 결제 요청입니다.");
    }

    const receipt = await prisma.$transaction(async (prisma) => {
      //1. 쿠폰 금액 차감
      //2. 카드 거래
      //3. 상품 재고 차감
      //4. 거래 내역 생성

      const { approvalAmount, usedCouponIds } = await couponProcess(
        // 쿠폰을 적용하고, 카드로 승인할 금액과 적용된 쿠폰을 반환합니다.
        userIdentity.coupons,
        totalPrice,
        hasCoupons
      );

      const { status: approvalStatus, isCouponOnly } = await approveTransaction(
        // 카드 거래를 승인합니다.
        approvalAmount,
        paymentMethod,
        hasCoupons
      );

      const receipt = await prisma.transaction.create({
        data: {
          totalPrice: totalPrice,
          status: approvalStatus as TransactionStatus,
          transactionMethod: userIdentity.transactionMethod,
          user: {
            connect: {
              id: user.id,
            },
          },
          posDevice: products.pos
            ? {
                connect: {
                  id: products.pos.id,
                },
              }
            : undefined,
          paymentMethod: isCouponOnly
            ? undefined
            : {
                connect: {
                  id: paymentMethod.id,
                },
              },
          coupon: {
            connect: usedCouponIds,
          },
          purchaseDetail: products.purchaseIds,
          purchaseType: products.purchaseType,
        },
      });
      delete receipt.id;
      await redis.publish(
        redisKey,
        JSON.stringify({
          status: receipt.status,
          transactionId: receipt.systemId,
        })
      );
      return receipt;
    });
    return receipt;
  } catch (e) {
    if (e instanceof TransactionException) {
      const receipt = await prisma.transaction.create({
        data: {
          totalPrice: totalPrice,
          status: e.status ? e.status : "CANCELED",
          statusText: e.message ? e.message : "알 수 없는 에러",
          transactionMethod: userIdentity.transactionMethod,
          user: {
            connect: {
              id: user.id,
            },
          },
          posDevice: products.pos
            ? {
                connect: {
                  id: products.pos.id,
                },
              }
            : undefined,
          paymentMethod: {
            connect: {
              id: paymentMethod.id,
            },
          },
          purchaseDetail: products.purchaseIds,
          purchaseType: products.purchaseType,
        },
      });
      await redis.publish(
        redisKey,
        JSON.stringify({
          status: receipt.status,
          transactionId: receipt.systemId,
        })
      );
      throw new HttpException(402, `${e.status} ${e.message}`);
    } else {
      throw new HttpException(e.status, e.message);
    }
  }
};
