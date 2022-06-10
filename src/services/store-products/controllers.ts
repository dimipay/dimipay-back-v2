import { prisma } from "@src/resources";
import { Request, Response } from "express";
import { ReqWithBody } from "@src/types";
import { Storing, StoringProduct, UpdateStoring } from "@src/interfaces";
import { HttpException } from "@src/exceptions";
import { Prisma } from "@prisma/client";

const importProducts = async (products: StoringProduct[], cost = 0) => {
  const productsData = await prisma.product.findMany({
    where: {
      systemId: {
        in: products.map((product) => product.productId),
      },
    },
  });

  const storingProducts = products
    ? (() => {
        const storingProducts: Prisma.ProductInOutLogCreateManyInput[] =
          products.map((product) => {
            const productData = productsData.find(
              (data) => data.systemId === product.productId
            );
            if (
              product.unitCost &&
              product.unitCost !== productData.purchaseCost
            ) {
              prisma.product.update({
                where: {
                  systemId: product.productId,
                },
                data: {
                  purchaseCost: product.unitCost,
                },
              });
            }
            return {
              productId: productData.id,
              delta: product.amount,
              type: "INCOME",
              unitCost: product.unitCost
                ? product.unitCost
                : productData.purchaseCost,
            };
          });
        return storingProducts;
      })()
    : null;

  const totalCost = products
    ? (() =>
        products.reduce((acc, cur) => {
          const unitCost = cur.unitCost
            ? cur.unitCost
            : productsData.find((data) => data.systemId === cur.productId)
                .purchaseCost;
          return acc + unitCost * cur.amount;
        }, cost))()
    : 0;

  return { storingProducts, totalCost };
};

export const storeProducts = async (
  req: ReqWithBody<Storing>,
  res: Response
) => {
  try {
    const adminAccount = await prisma.adminAccount.findFirst({
      where: {
        relatedUserId: req.user.id,
      },
    });
    if (!adminAccount) {
      throw new HttpException(403, "권한이 없습니다.");
    }

    const { storeDate, title, products } = req.body;
    const date = storeDate ? new Date(storeDate) : new Date();

    await prisma.$transaction(async (prisma) => {
      const { storingProducts, totalCost } = await importProducts(products, 0);

      const storing = await prisma.storeProducts.create({
        data: {
          storeDate: date,
          title: title
            ? title
            : `${date.getFullYear()}년 ${
                date.getMonth() + 1
              }월 ${date.getDate()}일 정기입고`,
          totalCost,
          productInLog: storingProducts
            ? {
                create: storingProducts,
              }
            : undefined,
          worker: {
            connect: {
              id: adminAccount.id,
            },
          },
        },
      });

      return res.status(201).json(storing);
    });
  } catch (e) {
    if (e instanceof HttpException) {
      throw new HttpException(e.status, e.message);
    }
    console.log(e);
    throw new HttpException(400, "상품을 입고하는 중 오류가 발생했습니다.");
  }
};

export const updateStoreProducts = async (
  req: ReqWithBody<UpdateStoring>,
  res: Response
) => {
  // product relation 추가
  // productInOutLog 추가
  // 총액 재계산
  try {
    const adminAccount = await prisma.adminAccount.findFirst({
      where: {
        relatedUserId: req.user.id,
      },
    });

    if (!adminAccount) {
      throw new HttpException(403, "권한이 없습니다.");
    }
    const { systemId, storeDate, title, products } = req.body;
    const date = storeDate ? new Date(storeDate) : new Date();

    const storingData = await prisma.storeProducts.findFirst({
      where: {
        systemId,
      },
    });

    await prisma.$transaction(async (prisma) => {
      const { storingProducts, totalCost } = await importProducts(
        products,
        storingData.totalCost
      );

      const storing = await prisma.storeProducts.update({
        where: {
          systemId,
        },
        data: {
          title: title ? title : storingData.title,
          totalCost,
          productInLog: storingProducts
            ? {
                create: storingProducts,
              }
            : undefined,
          worker: {
            connect: {
              id: adminAccount.id,
            },
          },
        },
      });

      return res.status(201).json(storing);
    });
  } catch (e) {}
};

export const getProductStoring = async (req: Request, res: Response) => {
  const { systemId } = req.params;
  const { id } = await prisma.product.findFirst({
    where: { systemId },
    select: { id: true },
  });
  const outcome = await prisma.productInOutLog.aggregate({
    _sum: {
      delta: true,
    },
    where: {
      productId: id,
      type: "OUTCOME",
    },
  });

  const income = await prisma.productInOutLog.aggregate({
    _sum: {
      delta: true,
    },
    where: {
      productId: id,
      type: "INCOME",
    },
  });
  const stock = income._sum.delta - outcome._sum.delta;
  return res.json(stock);
};
