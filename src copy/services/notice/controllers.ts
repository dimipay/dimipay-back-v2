import { prisma } from "@src/resources";
import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";

export const getCurrentNotice = async (req: Request, res: Response) => {
  try {
    const current = new Date();
  return res.json(
    await prisma.notice.findMany({
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
  } catch(e) {
    throw new HttpException(400, "공지를 조회하는 중 오류가 발생했습니다.");
  }
};
