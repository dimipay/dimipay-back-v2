import { HttpException } from "@src/exceptions";
import { prisma, generalPurchaseTransaction } from "@src/resources";
import { Response } from "express";
import { ReqWithBody } from "@src/types";
import { Product, Category, DiscountPolicy } from "@prisma/client";
import { ApprovalOrder } from "@src/interfaces";

const getProducts = async (productIds: string[]) => {
  const current = new Date();
  return await prisma.product.findMany({
    where: {
      systemId: { in: productIds },
    },
    include: {
      category: {
        include: {
          discountPolicy: {
            where: {
              relatedEvent: {
                OR: [
                  {
                    startsAt: {
                      lte: current,
                    },
                    endsAt: {
                      gte: current,
                    },
                  },
                  {
                    startsAt: {
                      lte: current,
                    },
                    endsAt: null,
                  },
                  {
                    startsAt: null,
                    endsAt: {
                      gte: current,
                    },
                  },
                  {
                    startsAt: null,
                    endsAt: null,
                  },
                ],
              },
            },
            orderBy: [
              {
                createdAt: "desc",
              },
            ],
          },
        },
      },
      excludedDiscountPolicy: {
        where: {
          relatedEvent: {
            OR: [
              {
                startsAt: {
                  lte: current,
                },
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: {
                  lte: current,
                },
                endsAt: null,
              },
              {
                startsAt: null,
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: null,
                endsAt: null,
              },
            ],
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
      },
      targettedDiscountPolicy: {
        where: {
          relatedEvent: {
            OR: [
              {
                startsAt: {
                  lte: current,
                },
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: {
                  lte: current,
                },
                endsAt: null,
              },
              {
                startsAt: null,
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: null,
                endsAt: null,
              },
            ],
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
      },
    },
  });
};

const calculatedPrice = (originalPrice: number, policy: DiscountPolicy) => {
  if (policy.fixedPrice) {
    return policy.fixedPrice;
  } else if (policy.percentRate) {
    return (
      Math.floor((originalPrice * (1 - policy.percentRate / 100)) / 10) * 10
    ); //단위 금액 원단위 절사
  }
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

export const paymentApproval = async (
  req: ReqWithBody<ApprovalOrder>,
  res: Response
) => {
  try {
    //여기서 실 승인
    const { products, userIdentity } = req.body;
    const productIds = products.map((product) => product.productId);
    const productsInfo = await getProducts(productIds);

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
    const receipt = await generalPurchaseTransaction(userIdentity, totalPrice, {
      orderedProducts,
      pos: req.pos,
    });
    return res.json(receipt);
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
