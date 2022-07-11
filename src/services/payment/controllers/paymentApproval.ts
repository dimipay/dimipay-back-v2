import { HttpException } from "@src/exceptions";
import {
  generalPurchaseTransaction,
  chargePrepaidCard,
  getProducts,
  loadRedis,
  key,
  checkValidTransaction,
  prisma,
} from "@src/resources";
import { Response, Request } from "express";
import { Product, Category, DiscountPolicy, PosDevice } from "@prisma/client";
import { ApprovalOrder, ApprovalUserIdentity } from "@src/interfaces";

const calculatedPrice = (originalPrice: number, policy: DiscountPolicy) => {
  if (policy.fixedPrice) {
    return policy.fixedPrice;
  } else if (policy.percentRate) {
    return (
      Math.floor((originalPrice * (1 - policy.percentRate / 100)) / 10) * 10
    ); //단위 금액 원단위 절사
  }
};

const nearestTransaction = async (pos: PosDevice) => {
  const transaction = await prisma.transaction.findFirst({
    where: {
      posDeviceSid: pos.systemId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  return transaction ? transaction.billingId : null;
};

const calculateProductUnitPrice = (
  product: Product & {
    category: Category & {
      discountPolicy: DiscountPolicy[];
    };
    excludedDiscountPolicy: DiscountPolicy[];
    targettedDiscountPolicy: DiscountPolicy[];
  }
) => {
  // 할인정책 우선순위. product target policy > product exception policy > category target policy
  if (product.targettedDiscountPolicy.length > 0) {
    return calculatedPrice(
      product.sellingPrice,
      product.targettedDiscountPolicy[0]
    );
  } else if (product.excludedDiscountPolicy.length > 0) {
    return product.sellingPrice;
  } else if (product.category.discountPolicy.length > 0) {
    return calculatedPrice(
      product.sellingPrice,
      product.category.discountPolicy[0]
    );
  } else {
    return product.sellingPrice;
  }
};

export const paymentApproval = async (req: Request, res: Response) => {
  try {
    //여기서 실 승인
    const { origin, cancel } = req.body;
    const redis = await loadRedis();
    const redisKey = key.stageProducts(req.pos.systemId);
    const { products, userIdentity } = JSON.parse(
      await redis.get(redisKey)
    ) as ApprovalOrder;

    if (cancel) {
      redis.del(redisKey);
      return res.status(200);
    }

    const productIds = products.map((product) => product.productId);
    const productsInfo = await getProducts({ productIds });

    const orderedProducts = products.map((product) => {
      const productInfo = productsInfo.find(
        (p) => p.systemId === product.productId
      );
      const calculatedUnitPrice = calculateProductUnitPrice(productInfo);

      return {
        ...product,
        product: productInfo,
        unit: calculatedUnitPrice,
        total: calculatedUnitPrice * product.amount,
      };
    });
    const totalPrice = orderedProducts.reduce((acc, cur) => acc + cur.total, 0);
    const billingId = await nearestTransaction(req.pos);
    const { transaction_by, date } = await checkValidTransaction(
      origin,
      totalPrice,
      billingId
    );
    const chargeCard = await chargePrepaidCard(
      userIdentity.paymentMethod,
      totalPrice,
      `CASH_DEPOSIT ${transaction_by}`
    );
    const receipt = await generalPurchaseTransaction(
      userIdentity,
      totalPrice,
      (+new Date(date)).toString(),
      {
        orderedProducts,
        pos: req.pos,
      }
    );
    redis.del(redisKey);
    return res.json(receipt);
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
