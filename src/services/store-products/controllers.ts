import { prisma } from "@src/resources";
import { Request, Response } from "express";
import { ReqWithBody } from "@src/types";
import { Storing, StoringProduct, UpdateStoring } from "@src/interfaces";
import { HttpException } from "@src/exceptions";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";

const importNewProduct = (product: StoringProduct) => {
  console.log(product.barcode);
  const productData = prisma.product.create({
    data: {
      systemId: v4(),
      barcode: product.barcode,
      name: product.name,
      purchaseCost: product.purchaseCost,
      sellingPrice: Math.floor((product.purchaseCost * 1.3) / 10) * 10,
      category: {
        connect: {
          systemId: "3fd1e40d-6457-4b9d-9b91-39c7ba2cecba",
        },
      },
    },
  });
  return productData;
};

const importProducts = async (products: StoringProduct[], cost = 0) => {
  // 기존 입고에 추가하는 경우 이전 total cost 값을 넣어줌.
  const productsData = await prisma.product.findMany({
    where: {
      barcode: {
        in: products.map((product) => product.barcode),
      },
    },
  });

  const products2 = await Promise.all(
    products.map(async (product) => {
      const productData =
        productsData.find((data) => data.barcode === product.barcode) ||
        (await importNewProduct(product));
      return {
        product,
        productData,
      };
    })
  );

  const storingProducts = products
    ? (() => {
        const storingProducts: Prisma.ProductInOutLogCreateManyInput[] =
          products2.map(({ product, productData }) => {
            // 새로운 매입가가 기존 매입가와 다른 경우 상품 정보에 최신 매입가 반영
            if (
              product.purchaseCost &&
              product.purchaseCost !== productData.purchaseCost
            ) {
              prisma.product.update({
                where: {
                  systemId: productData.systemId,
                },
                data: {
                  purchaseCost: product.purchaseCost,
                },
              });
            }
            return {
              productSid: productData.systemId,
              delta: product.amount,
              type: "INCOME",
              unitCost: product.purchaseCost
                ? product.purchaseCost
                : productData.purchaseCost,
            };
          });
        return storingProducts;
      })()
    : null;

  const totalCost = products
    ? (() =>
        storingProducts.reduce((acc, cur) => {
          const unitCost = cur.unitCost;
          return acc + unitCost * cur.delta;
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
        relatedUserSid: req.user.systemId,
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
        relatedUserSid: req.user.systemId,
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

  const sum = await prisma.productInOutLog.groupBy({
    by: ["productSid"],
    _sum: {
      delta: true,
    },
  });
  const stock = sum.map((sum) => {
    return {
      productSid: sum.productSid,
      stock: sum._sum.delta,
    };
  });
  // const stock = income._sum.delta - outcome._sum.delta;
  return res.json(stock);
};
