import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import bcrypt from "bcrypt";
import {
  issueCustomToken,
  key,
  loadRedis,
  prisma,
  sendSms,
  csprng,
} from "@src/resources";

// 이 엔드포인트는 FaceSign 서비스에 등록되어,
// 얼굴인증이 완료됐을 때 인증정보를 포함하여 호출됩니다
export const faceSignResultListener = async (req: Request, res: Response) => {
  // TODO
  // 1. 얼굴인증 결과를 데이터베이스에 저장
  // 2. 20초 후에 데이터베이스에서 삭제
  res.send();
};

export const getFaceSignResult = async (req: Request, res: Response) => {
  // TODO
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
  try {
    const body: {
      phoneNumber: string;
      pin: string;
    } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: {
          endsWith: body.phoneNumber,
        },
      },
      select: {
        phoneNumber: true,
        isDisabled: true,
        paymentPin: true,
        systemId: true,
      },
    });

    if (!user) throw new HttpException(400, "일치하는 사용자 찾을 수 없어요");
    if (user.isDisabled)
      throw new HttpException(
        400,
        "비활성화된 계정입니다. 관리자에게 문의해주세요."
      );
    if (!user.paymentPin)
      throw new HttpException(400, "결제비밀번호가 설정되지 않았습니다.");

    const isPinWrong = !bcrypt.compareSync(body.pin, user.paymentPin);
    if (isPinWrong)
      throw new HttpException(400, "결제비밀번호가 올바르지 않아요");

    const { phoneNumber } = user;

    if (!phoneNumber)
      throw new HttpException(
        400,
        "문자인증이 비활성화되어있어요, 앱에서 문자인증을 설정해야 사용할 수 있어요."
      );

    const otp = csprng().toString().substr(0, 4);

    await sendSms(user.phoneNumber, `[디미페이] 현장결제 인증번호 ${otp}`);

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
    const redisKey = key.smsCode(user.systemId);
    await redis.set(redisKey, bcrypt.hashSync(otp.toString(), 10));
    await redis.expire(redisKey, 64);
  } catch (e) {
    if (e.status) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e.status, e.message);
    }
    console.log(e);
    throw new HttpException(400, "로그인할 수 없습니다.");
  }
};

export const validateSmsVerification = async (req: Request, res: Response) => {
  try {
    const body: {
      smsCode: string;
      phoneNumber: string;
      systemId?: string;
    } = req.body;

    const user = await prisma.user.findFirst({
      where: { phoneNumber: { endsWith: body.phoneNumber } },
      select: {
        id: true,
        systemId: true,
        isDisabled: true,
        name: true,
        profileImage: true,
        receivedCoupons: true,
      },
    });
    body.systemId = user.systemId;

    const redis = await loadRedis();
    const redisKey = key.smsCode(body.systemId);
    const redisValue = await redis.get(redisKey);

    if (!redisValue) {
      return res.status(400).json({
        isValid: false,
        message: "인증번호가 유효하지 않습니다.",
      });
    }
    const isValid = bcrypt.compareSync(body.smsCode, redisValue);

    if (isValid) {
      const { id: paymentMethod } = await prisma.paymentMethod.findFirst({
        where: {
          ownerSid: user.systemId,
          type: "PREPAID",
        },
      });

      return res.json({ ...user, paymentMethod });
    } else {
      return res.status(400).json({
        isValid,
        message: "인증번호가 유효하지 않습니다.",
      });
    }
  } catch (e) {
    if (e.status) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e.status, e.message);
    }
    throw new HttpException(400, "인증에 실패했습니다.");
  }
};
