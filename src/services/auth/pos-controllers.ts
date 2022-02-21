import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import bcrypt from "bcrypt";
import { issueCustomToken, prisma } from "@src/resources";

// 이 엔드포인트는 FaceSign 서비스에 등록되어,
// 얼굴인증이 완료됐을 때 인증정보를 포함하여 호출됩니다
export const faceSignResultListener = async (req: Request, res: Response) => {
  // 1. 얼굴인증 결과를 데이터베이스에 저장
  // 2. 20초 후에 데이터베이스에서 삭제
  res.send();
};

export const getFaceSignResult = async (req: Request, res: Response) => {
  // 1. 얼굴인증 결과를 데이터베이스에서 조회
  // 2. 조회된 결과를 반환
  throw new HttpException(501, "NOT IMPLEMENTED");
};

export const getPinMatchedUser = async (req: Request, res: Response) => {
  const body: {
    pin: string;
    ids: string[];
  } = req.body;

  const fetchedUsers = await prisma.user.findMany({
    where: {
      systemId: {
        in: body.ids,
      },
    },
  });

  const matchedUser = fetchedUsers.find((user) =>
    bcrypt.compare(body.pin, user.paymentPin)
  );

  if (matchedUser)
    return res.json({
      ...matchedUser,
      succeed: true,
      paymentToken: issueCustomToken({
        userId: matchedUser.systemId,
        method: "FACESIGN_PIN_MATCH",
      }),
    });

  res.status(401).json({
    succeed: false,
  });
};
