import { prisma } from "@src/resources";
import { Request } from "express";

export const getMyInfo = async (req: Request) => {
  const user = await prisma.user.findFirst({
    where: {
      id: req.user.id,
    },
    select: {
      transactions: false,
    },
  });

  return user;
};
