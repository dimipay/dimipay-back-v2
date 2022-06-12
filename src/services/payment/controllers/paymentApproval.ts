import { HttpException } from "@src/exceptions";
import { prisma, generalPurchaseTransaction } from "@src/resources";
import { Response } from "express";
import { ReqWithBody } from "@src/types";
import { Product, Category, DiscountPolicy } from "@prisma/client";
import { ApprovalOrder } from "@src/interfaces";
import { loadRedis, chargePrepaidCard } from "@src/resources";
import config from "@src/config";

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
  req: ReqWithBody<Partial<ApprovalOrder>>,
  res: Response
) => {
  const TIMEOUT = 60000;
  if (!req.body.userIdentity) {
    req.body.userIdentity = {
      systemId: config.defaultApproval.user,
      paymentMethod: config.defaultApproval.paymentMethod,
      transactionMethod: "APP_QR",
    };
  }
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

    // const receipt = await generalPurchaseTransaction(
    //   userIdentity,
    //   totalPrice,
    //   {
    //     orderedProducts,
    //     pos: req.pos,
    //   }
    // );

    // return res.json(receipt);

    //여기서부터 싹 날리세요
    const headers = {
      //headers for SSE
      "Content-Type": "text/event-stream",
      "Connection": "keep-alive",
      "Cache-Control": "no-cache",
    };
    res.writeHead(200, headers);
    const client = (await loadRedis()).duplicate();
    await client.connect();
    const redisKey = "deposit-hook";

    const productId = orderedProducts.map((product) => {
      return { id: product.product.id };
    });

    const timeout = setTimeout(async () => {
      client.unsubscribe(redisKey);
      client.quit();

      const receipt = await prisma.transaction.create({
        data: {
          totalPrice: totalPrice,
          status: "CANCELED",
          transactionMethod: userIdentity.transactionMethod,
          user: {
            connect: {
              id: req.user.id,
            },
          },
          statusText: "TIMEOUT: 입금시간 초과",
          posDevice: {
            connect: {
              id: req.pos.id,
            },
          },
          paymentMethod: {
            connect: {
              systemId: req.body.userIdentity.paymentMethod,
            },
          },
          products: {
            connect: productId,
          },
        },
      });

      res.write(
        `data: ${JSON.stringify({
          status: "TIMEOUT",
          memo: null,
        })}` + "\n\n"
      );
      return res.end();
    }, TIMEOUT);
    client.subscribe(redisKey, async (message) => {
      clearTimeout(timeout);
      const deposit = JSON.parse(message);
      chargePrepaidCard(
        config.defaultApproval.paymentMethod,
        deposit.amount,
        "CASH_DEPOSIT"
      );
      if (deposit.amount <= totalPrice) {
        const receipt = await prisma.transaction.create({
          data: {
            totalPrice: totalPrice,
            status: "CANCELED",
            transactionMethod: userIdentity.transactionMethod,
            user: {
              connect: {
                systemId: config.defaultApproval.user,
              },
            },
            statusText: "입금금액 부족",
            posDevice: {
              connect: {
                id: req.pos.id,
              },
            },
            paymentMethod: {
              connect: {
                systemId: req.body.userIdentity.paymentMethod,
              },
            },
            products: {
              connect: productId,
            },
          },
        });
        res.write(
          `data: ${JSON.stringify({
            status: "NOT_ENOUGH_AMOUNT",
            memo: null,
          })}` + "\n\n"
        );
        client.quit();
        return res.end();
      }
      const receipt = await generalPurchaseTransaction(
        userIdentity,
        totalPrice,
        {
          orderedProducts,
          pos: req.pos,
        }
      );

      res.write(
        `data: ${JSON.stringify({
          status: "SUCCESS",
          memo: deposit.memo,
        })}` + "\n\n"
      );
      client.quit();
      return res.end();
    });

    req.on("close", () => {
      return res.end();
    });
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
