import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getCurrentNotice = async (req: Request, res: Response) => {
  const current = new Date();
  return res.json(
    await prisma.notice.findFirst({
      where: {
        startsAt: {
          lte: current,
        },
        endsAt: {
          gte: current,
        },
      },
      select: {
        createdAt: true,
        title: true,
        description: true,
        content: true,
      },
    })
  );
};
