import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getProductByBarcode = async (req: Request, res: Response) => {
  const { barcode } = req.params;

  const product = await prisma.product.findFirst({
    where: {
      barcode,
    },
  });

  res.json({
    product,
  });
};
