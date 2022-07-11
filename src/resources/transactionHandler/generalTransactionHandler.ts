import { TransactionStatus, Coupon, Prisma } from "@prisma/client";
import { prisma, loadRedis, key } from "@src/resources";
import {
  TransactionPaymentMethod,
  ApprovalUserIdentity,
  GeneralPurchase,
  SpecialPurchase,
} from "@src/interfaces";
import { TransactionException, HttpException } from "@src/exceptions";
import { v4 } from "uuid";
import { couponProcess, approveTransaction } from "./common";

export const generalPurchaseTransaction = async (
  userIdentity: ApprovalUserIdentity,
  totalPrice: any,
  billingId: string,
  products: GeneralPurchase,
  isCouponPurchase = true
) => {
  const user = await prisma.user.findFirst({
    where: {
      systemId: userIdentity.systemId,
    },
  });

  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: {
      systemId: userIdentity.paymentMethod,
    },
    include: {
      generalCard: true,
      prepaidCard: true,
    },
  });

  const productIds = products.orderedProducts.map((product) => {
    return { id: product.product.id };
  });

  const redis = await loadRedis();
  const redisKey = key.approvalResponse(user.id);

  try {
    if (userIdentity.transactionMethod === "INAPP" || !products.pos) {
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
        isCouponPurchase
      );

      const { status: approvalStatus, isCouponOnly } = await approveTransaction(
        // 카드 거래를 승인합니다.
        approvalAmount,
        paymentMethod,
        isCouponPurchase
      );

      // 상품 재고 차감
      const productReleases: Prisma.ProductInOutLogCreateManyInput[] =
        products.orderedProducts.map((product) => {
          return {
            systemId: v4(),
            delta: product.amount * -1,
            message: "",
            productSid: product.product.systemId,
            type: "OUTCOME",
            unitCost: product.unit,
          };
        });

      const productInOutLogSids = productReleases.map((productRelease) => {
        return { systemId: productRelease.systemId };
      });

      await prisma.productInOutLog.createMany({
        data: productReleases,
      });

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
          posDevice: {
            connect: {
              id: products.pos.id,
            },
          },
          billingId: billingId ? billingId : null,
          paymentMethod: {
            connect: {
              id: isCouponOnly ? null : paymentMethod.id,
            },
          },
          coupon: {
            connect: usedCouponIds,
          },
          products: {
            connect: productIds,
          },
          productOutLog: {
            connect: productInOutLogSids,
          },
          purchaseType: "GENERAL",
        },
      });
      delete receipt.id;
      return receipt;
    });
    await redis.publish(
      redisKey,
      JSON.stringify({
        status: receipt.status,
        transactionId: receipt.systemId,
      })
    );
    return receipt;
  } catch (e) {
    const receipt = await prisma.transaction.create({
      data: {
        totalPrice: totalPrice,
        status: e.status ? e.status : "CANCELED",
        transactionMethod: userIdentity.transactionMethod,
        user: {
          connect: {
            id: user.id,
          },
        },
        statusText: e.message ? e.message : "알 수 없는 에러",
        posDevice: {
          connect: {
            id: products.pos.id,
          },
        },
        paymentMethod: {
          connect: {
            id: paymentMethod.id,
          },
        },
        products: {
          connect: productIds,
        },
      },
    });
    await redis.publish(
      redisKey,
      JSON.stringify({
        status: receipt.status,
        transactionId: receipt.systemId,
      })
    );
    if (e instanceof TransactionException) {
      throw new HttpException(402, `${e.status} ${e.message}`);
    } else {
      throw new HttpException(e.status, e.message);
    }
  }
};
