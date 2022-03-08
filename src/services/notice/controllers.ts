import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getCurrentNotice = async (req: Request, res: Response) => {
  const current = new Date();
  return res.json(
    await prisma.notice.findFirst({
      where: {
        OR: [
          {
            startsAt: {
              lte: current,
            },
            endsAt: {
              gte: current,
            },
          },
          {
            startsAt: {
              lte: current,
            },
            endsAt: null,
          },
        ],
      },
      select: {
        createdAt: true,
        title: true,
        description: true,
      },
    })
  );
};
