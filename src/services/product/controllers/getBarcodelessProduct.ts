import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getBarcodelessProducts = async (req: Request, res: Response) => {
  const barcodelessProducts = await prisma.product.findMany({
    where: {
      barcode: null,
    },
  });

  res.json({
    barcodelessProducts,
  });
};
