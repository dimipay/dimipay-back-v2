import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getOngoingEvents = async (req: Request, res: Response) => {
  try {
    const current = new Date();
    return res.json(
      await prisma.event.findMany({
        orderBy: [
          {
            endsAt: 'asc',
          }
        ],
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
            {
              startsAt: null,
              endsAt: {
                gte: current,
              },
            },
            {
              startsAt: null,
              endsAt: null,
            },
          ],
        },
        select: {
          title: true,
          description: true,
          url: true,
          startsAt: true,
          endsAt: true,
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, "이벤트를 조회하는 중 오류가 발생했습니다.");
  }
};

export const getUpcommingEvents = async (req: Request, res: Response) => {
  try {
    const current = new Date();
    return res.json(
      await prisma.event.findMany({
        orderBy: [
          {
            startsAt: 'asc',
          }
        ],
        where: {
          OR: [
            {
              startsAt: {
                gte: current,
              },
            },
          ],
        },
        select: {
          title: true,
          description: true,
          url: true,
          startsAt: true,
          endsAt: true,
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, "이벤트를 조회하는 중 오류가 발생했습니다.");
  }
};

export const getPastEvents = async (req: Request, res: Response) => {
  try {
    const skipPage = parseInt(req.params.page) - 1;
    const current = new Date();
    return res.json(
      await prisma.event.findMany({
        skip: skipPage * 3,
        take: 3,
        orderBy: [
          {
            endsAt: 'desc',
          }
        ],
        where: {
          OR: [
            {
              endsAt: {
                lte: current,
              },
            },
          ],
        },
        select: {
          title: true,
          description: true,
          url: true,
          startsAt: true,
          endsAt: true,
        },
      })
    );
  } catch (e) {
    throw new HttpException(400, "이벤트를 조회하는 중 오류가 발생했습니다.");
  }
};