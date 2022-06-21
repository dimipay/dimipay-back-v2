import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Request, Response } from "express";

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
    });

    res.json({
      product,
    });
  } catch (e) {
    if (e instanceof HttpException) {
      throw new HttpException(e.status, e.message);
    }
    throw new HttpException(400, "상품을 찾는 중 오류가 발생했습니다.");
  }
};
