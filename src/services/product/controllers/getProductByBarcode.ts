import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Request, Response } from "express";
import { Product, DiscountPolicy } from "@prisma/client";

const discountPolicyWrapper = (policy: DiscountPolicy) => {
  return {
    percent: policy.percentRate || null,
    fixedPrice: policy.fixedPrice || null,
  };
};

const selectValidDiscountPolicy = (
  product: Partial<Product> & {
    category: {
      discountPolicy: DiscountPolicy[];
    };
    excludedDiscountPolicy: DiscountPolicy[];
    targettedDiscountPolicy: DiscountPolicy[];
  }
) => {
  // 할인정책 우선순위. product target policy > product exception policy > category target policy
  if (product.targettedDiscountPolicy.length > 0) {
    return discountPolicyWrapper(product.targettedDiscountPolicy[0]);
  } else if (product.excludedDiscountPolicy.length > 0) {
    return null;
  } else if (product.category.discountPolicy.length > 0) {
    return discountPolicyWrapper(product.category.discountPolicy[0]);
  } else {
    return null;
  }
};

export const getProductByBarcode = async (req: Request, res: Response) => {
  const { barcode } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: {
        AND: {
          barcode,
          is_deleted: false,
        },
      },
      select: {
        systemId: true,
        name: true,
        alias: true,
        sellingPrice: true,
        barcode: true,
        sellingStopped: true,
        category: {
          select: {
            discountPolicy: true,
          },
        },
        excludedDiscountPolicy: true,
        targettedDiscountPolicy: true,
      },
    });

    if (product.sellingStopped)
      throw new HttpException(401, "판매가 중단된 상품이예요");

    const validPolicy = selectValidDiscountPolicy(product);

    res.json({
      product: {
        systemId: product.systemId,
        name: product.alias || product.name,
        sellingPrice: product.sellingPrice,
        barcode: product.barcode,
        sellingStopped: product.sellingPrice,
        discountPolicy: validPolicy,
      },
    });
  } catch (e) {
    if (e instanceof HttpException) {
      throw new HttpException(e.status, e.message);
    }
    throw new HttpException(400, "상품을 찾는 중 오류가 발생했습니다.");
  }
};
