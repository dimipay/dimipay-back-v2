import { Request, Response } from "express";
import { HttpException } from "@src/exceptions";
import {
  issue as issueToken,
  getTokenType,
  verify,
  prisma,
  getIdentity,
} from "@src/resources";
import { LoginInfo, UserIdentity } from "@src/interfaces";
import { Prisma, User } from "@prisma/client";
import bcrypt from "bcrypt";

const createTokensFromUser = async (user: Partial<User>) => {
  const { id, systemId } = user;
  return {
    accessToken: await issueToken({ id, systemId }, false),
    refreshToken: await issueToken({ id, systemId }, true),
  };
};

const registerOrLogin = async (apiData: Partial<UserIdentity>) => {
  const queriedUser = await prisma.user.findFirst({
    where: { systemId: apiData.id.toString() },
    select: {
      systemId: true,
      accountName: true,
      isDisabled: true,
      isTeacher: true,
      name: true,
      paymentMethods: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
      paymentPin: true,
      deviceUid: true,
    },
  });
  if (queriedUser) {
    if (
      // 아마 셋중 하나만 있는 일은 없음.
      queriedUser.paymentPin ||
      queriedUser.deviceUid
    ) {
      return { user: queriedUser, isFirstVisit: false };
    }
    // PIN, device 미등록 사용자
    return { user: queriedUser, isFirstVisit: true };
  }

  const mappedUser: Prisma.UserCreateInput = {
    accountName: apiData.username,
    name: apiData.name,
    profileImage: apiData.photofile2 || apiData.photofile1,
    studentNumber: apiData.studentNumber,
    systemId: apiData.id.toString(),
    isTeacher: ["D", "T"].includes(apiData.user_type),
    phoneNumber: apiData.phone
      ? apiData.phone.startsWith("01")
        ? "+82 " + apiData.phone.slice(1)
        : null
      : null,
  };

  const user = await prisma.user.create({
    data: mappedUser,
  });

  // 최초 등록 사용자
  return { user, isFirstVisit: true };
};

export const identifyUser = async (req: Request, res: Response) => {
  const body: LoginInfo = req.body;
  try {
    const { apiData, status } = await getIdentity(body);
    // if (body.username == body.password) {
    //   throw new HttpException(400, "아이디와 비밀번호가 동일합니다.");
    // }
    const { user, isFirstVisit } = await registerOrLogin(apiData);
    if (isFirstVisit) {
      if (body.pin && body.deviceUid) {
        console.log("daffdsf");
        prisma.user.update({
          where: { systemId: user.systemId },
          data: {
            paymentPin: bcrypt.hashSync(body.pin, 10),
            deviceUid: bcrypt.hashSync(body.deviceUid, 10),
          },
        });

        return res.json({ ...(await createTokensFromUser(user)) });
      } else {
        throw new HttpException(400, "신규 등록이 필요합니다.");
      }
    } else {
      if (bcrypt.compareSync(body.pin, user.paymentPin)) {
        if (!bcrypt.compareSync(body.deviceUid, user.deviceUid)) {
          if (body.resetDevice) {
            // deviceUid 재설정
            prisma.user.update({
              where: { systemId: user.systemId },
              data: {
                deviceUid: bcrypt.hashSync(body.deviceUid, 10),
              },
            });

            return res.json({ ...(await createTokensFromUser(user)) });
          } else {
            throw new HttpException(
              401,
              "새로운 장치로 로그인하셨습니다. 기기를 변경할까요?"
            );
          }
        } else {
          // 등록된 기기에서 재로그인하는 경우
          return res.json({ ...(await createTokensFromUser(user)) });
        }
      } else {
        throw new HttpException(400, "올바르지 않은 PIN입니다.");
      }
    }
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const { token: refreshToken } = req;
  if (!refreshToken)
    throw new HttpException(400, "리프레시 토큰이 전달되지 않았습니다.");

  const tokenType = await getTokenType(refreshToken);
  if (tokenType !== "REFRESH")
    throw new HttpException(400, "리프레시 토큰이 아닙니다.");

  const payload = await verify(refreshToken);
  const identity = await prisma.user.findUnique({ where: { id: payload.id } });
  return res.json(await createTokensFromUser(identity));
};
