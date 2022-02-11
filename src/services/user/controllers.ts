import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getMyInfo = async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst({
    where: {
      id: req.user.id,
    },
    select: {
      transaction: false,
    },
  });

  return user;
};
