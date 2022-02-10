import { Request, Response } from "express";
import { HttpException } from "../../exceptions";
import { issueToken, prisma } from "@src/resources";

export const identifyUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    res.json(user);
  } catch (error) {
    throw new HttpException(error.message, error.status);
  }
  //로그인 로직
};

export const registerUser = async (req: Request, res: Response) => {
  //회원가입 로직
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  //토큰 재발급 로직
};
