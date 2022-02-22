import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import bcrypt from "bcrypt";
import {
  issueCustomToken,
  key,
  loadRedis,
  prisma,
  sendSms,
} from "@src/resources";

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

export const requestSmsVerification = async (req: Request, res: Response) => {
  const phoneNumber = req.user?.phoneNumber;
  if (!phoneNumber) {
    res.status(400).json({
      isValid: false,
      message:
        "디미페이에 전화번호가 등록되지 않았어요. 앱에서 전화번호를 등록하고 다시 시도해주세요.",
    });
  }

  const otp = Math.floor(Math.random() * 10000);
  await sendSms(phoneNumber, `[디미페이] 현장결제 인증번호 ${otp}`);

  const maskStartIndex = phoneNumber.length - 7;
  const maskEndIndex = phoneNumber.length - 2;

  // 주의! 마스킹 로직을 변경할 때에는 한/중/일/몽의 전화번호 형식을 고려해주세요

  // "+82 10-3728-5016" -> "+82 10-37**-**16"
  // "+976 7007-1020" -> "+976 70**-**20"

  const maskedPhoneNumber = [
    ...phoneNumber.slice(0, maskStartIndex),
    ...phoneNumber.slice(maskStartIndex, maskEndIndex).replace(/[0-9]/g, "*"),
    ...phoneNumber.slice(maskEndIndex),
  ].join("");

  res.json({
    isValid: true,
    maskedPhoneNumber,
    timeLimitSeconds: 60,
  });

  const redis = await loadRedis();
  const redisKey = key.smsCode(req.user.systemId);
  await redis.set(redisKey, bcrypt.hashSync(otp.toString(), 10));
  redis.expire(redisKey, 64);
};
