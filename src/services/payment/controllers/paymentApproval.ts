import { HttpException, TransactionException } from "@src/exceptions";
import { prisma, approveGeneralCard, approvePrepaidCard, chargePrepaidCard } from "@src/resources";
import { Response } from "express";
import { ReqWithBody } from "@src/types";
import { Product, Category, DiscountPolicy, PosDevice, ProductInOutLog, Prisma, TransactionStatus, Coupon } from "@prisma/client";
import { ApprovalOrder, ApprovalProduct, ApprovalUserIdentity, TransactionPaymentMethod } from "@src/interfaces";

const getProducts = async (productIds: string[]) => {
  const current = new Date();
  return await prisma.product.findMany({
    where: {
      id: { in: productIds }
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
                ]
              }
            },
            orderBy: [
              {
                createdAt: 'desc',
              }
            ],
          },
        }
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
            ]
          }
        },
        orderBy: [
          {
            createdAt: 'desc',
          }
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
            ]
          }
        },
        orderBy: [
          {
            createdAt: 'desc',
          }
        ],
      },
    }
  });
}

const calculateCouponDiscount = (amount: number, coupons: Coupon[]) => {
  const discounted = coupons.reduce((acc, coupon, idx, arr) => {
    const couponDiscount = acc - coupon.amount;
    if(couponDiscount < 0) {
      arr.splice(idx + 1);
      coupons.splice(idx + 1);
    }
    return couponDiscount;
  }, amount);

  return { discounted, coupons };
}
 
const calculatedPrice = (amount: number, originalPrice: number, policy: DiscountPolicy) => {
  if(policy.fixedPrice) {
    return amount * policy.fixedPrice;
  } else if (policy.percentRate) {
    return amount * Math.floor(originalPrice * (1 - (policy.percentRate / 100)) / 10 ) * 10;  //단위 금액 원단위 절사
  }
}

const calculateProductTotalPrice = (amount: number, product: Product & {
  category: Category & {
      discountPolicy: DiscountPolicy[];
  };
  excludedDiscountPolicy: DiscountPolicy[];
  targettedDiscountPolicy: DiscountPolicy[];
}) => {

  // 할인정책 우선순위. product target policy > product exception policy > category target policy
  if(product.targettedDiscountPolicy.length > 0) {
    return calculatedPrice(amount, product.price, product.targettedDiscountPolicy[0]);
  } else if(product.excludedDiscountPolicy.length > 0) {
    return amount * product.price;
  } else if(product.category.discountPolicy.length > 0) {
    return calculatedPrice(amount, product.price, product.category.discountPolicy[0]);
  } else {
    return amount * product.price;
  }
};

const transaction = async (pos: PosDevice, userIdentity: ApprovalUserIdentity, totalPrice: any, orderedProducts: ApprovalProduct[] ) => {
  try {
    const productIds = orderedProducts.map(product => {
      return {id: product.product.id};
    });
    const coupons = await prisma.coupon.findMany({
      where: {
        AND: [{
          id: { in:  userIdentity.coupons },
          usedTransactionId: null,
        },
        {
          OR: [
            {
              expiresAt: { gt: new Date() },
            },
            {
              expiresAt: null,
            }
          ]
        }
      ]
      },
      orderBy: [
        {
          amount: 'desc',
        }
      ]
    });
    const user = await prisma.user.findFirst({
      where: {
        systemId: userIdentity.systemId,
      }
    });
    const paymentMethod: TransactionPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: userIdentity.paymentMethod,
      },
      include: {
        generalCard: true,
        prepaidCard: true,
      }
    });
    const receipt = await prisma.$transaction(async () => {
      //1. 쿠폰 금액 차감
      //2. 카드 거래
      //3. 상품 재고 차감
      //4. 거래 내역 생성
      
      const {discounted: approvalAmount, coupons: usedCoupons} = calculateCouponDiscount(totalPrice, coupons);  //쿠폰 금액 차감
      const usedCouponIds = usedCoupons.map(coupon => {
        return {id: coupon.id};
      });

      const approvalStatus: TransactionStatus = await (async () => {
        if(approvalAmount > 0) {
          try {
            if(paymentMethod.type === "PREPAID"){
              return await approvePrepaidCard(paymentMethod, approvalAmount);
            } else if(paymentMethod.type === "GENERAL") {
              // return await approveGeneralCard(paymentMethod, approvalAmount);
              throw new TransactionException("CANCELED", "지원하지 않는 결제수단입니다.");
            }
          } catch(e) {
            return e.message;
          }
        } else if (approvalAmount < 0) {
          // 쿠폰 금액 페이머니로 적립하는 로직
          chargePrepaidCard(paymentMethod, Math.abs(approvalAmount), "쿠폰 잔액 적립");
          return "CONFIRMED";
        }
      })();
      

      // 상품 재고 차감
      const productReleases: Prisma.ProductInOutLogCreateManyInput[] = orderedProducts.map(product => {
        return {
          delta: product.amount,
          message: "",
          productId: product.product.id
        }
      });
      await prisma.productInOutLog.createMany({
        data: productReleases
      })

      const receipt = await prisma.transaction.create({
        data: {
          totalPrice: totalPrice,
          status: approvalStatus,
          authMethod: userIdentity.authMethod,
          user: {
            connect: {
              id: user.id,
            }
          },
          posDevice: {
            connect: {
              id: pos.id,
            }
          },
          paymentMethod: {
            connect: {
              id: paymentMethod.id,
            }
          },
          coupon: {
            connect: usedCouponIds,
          },
          products: {
            connect: productIds,
          }
        }
      });   
      return receipt;
    });
    return receipt;
  } catch(e) {
    throw new HttpException(e.status, e.message);
  }
}

export const paymentApproval = async (req: ReqWithBody<ApprovalOrder>, res: Response) => {
  try {
    //여기서 실 승인
    const { products, userIdentity } = req.body;
    const productIds = products.map(product => product.productId);
    const productsInfo = await getProducts(productIds);

    const orderedProducts = products.map(product => {
      const productInfo = productsInfo.find(p => p.id === product.productId);
      const calculatedPrice = calculateProductTotalPrice(product.amount, productInfo);
      return {
        ...product,
        product: productInfo,
        price: calculatedPrice,
      }
    });
    const totalPrice = orderedProducts.reduce((acc, cur) => acc + cur.price, 0);
    const receipt = await transaction(req.pos, userIdentity, totalPrice, orderedProducts);
    return res.json(receipt);
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};