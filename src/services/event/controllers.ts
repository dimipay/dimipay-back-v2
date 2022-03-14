import { HttpException } from "@src/exceptions";
import { prisma } from "@src/resources";
import { Request, Response } from "express";

export const getEvents = async (req: Request, res: Response) => {
  try {
    return res.json(
      await prisma.event.findMany({
        where: {},
        include: {},
      })
    );
  } catch (e) {
    throw new HttpException(400, "이벤트를 조회하는 중 오류가 발생했습니다.");
  }
};
