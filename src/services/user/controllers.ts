import { prisma } from "@src/resources";
import { Request } from "express";

export const getMyInfo = async (req: Request) => {
  const user = await prisma.user.findFirst({
    where: {
      systemId: req.user.systemId,
    },
    select: {
      transactions: false,
    },
  });

  return user;
};
