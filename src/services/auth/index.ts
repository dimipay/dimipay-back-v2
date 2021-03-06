import Joi from "joi";
import { createService } from "../index";
import createJoiError from "@src/resources/createJoiError";

import login from "./controller";
import onBoarding from "./onBoarding";
import * as posControllers from "./pos-controllers";
import refreshAccessToken from "./refreshAccessToken";

export default createService({
  name: "인증 서비스",
  baseURL: "/auth",
  routes: [
    {
      method: "post",
      path: "/login",
      handler: login,
      needAuth: false,
      description: "Google OAuth로 Access Token과 Refresh Token을 발급합니다.",
      validateSchema: {
        idToken: Joi.string().required(),
      },
    },
    {
      method: "post",
      handler: onBoarding,
      needAuth: true,
      path: "/onBoarding",
      description:
        "deviceUid와 bioKey를 함께 받으며 pin을 생성하거나 비교합니다.",
      permission: ["Student"],
      validateSchema: {
        bioKey: Joi.string().required(),
        deviceUid: Joi.string().required(),
        paymentPin: Joi.string()
          .regex(/^\d{4}$/)
          .required()
          .error(createJoiError(400, "비밀번호 규칙에 맞춰 입력해주세요")),
      },
    },
    {
      method: "get",
      path: "/refresh",
      handler: refreshAccessToken,
      description:
        "Refresh Token으로 Access Token을 재발급합니다. Refresh Token을 Bearer Header에 넣어서 보내주세요.",
      needAuth: false,
    },
    {
      method: "post",
      path: "/facesign-result-listener",
      handler: posControllers.faceSignResultListener,
      description: "[ TODO ] FaceSign 앱에서 얼굴인증을 수행한 결과를 받습니다",
      needAuth: false,
    },
    {
      method: "post",
      path: "/facesign-result",
      handler: posControllers.getFaceSignResult,
      description: "[ TODO ] FaceSign 앱에서 얼굴인증을 수행한 결과를 받습니다",
      needAuth: true,
    },
    {
      method: "post",
      path: "/user-pin-match",
      handler: posControllers.getPinMatchedUser,
      description: "주어진 사용자중 PIN이 일치하는 사용자의 정보를 반환합니다",
      needAuth: true,
      validateSchema: {
        ids: Joi.array().items(Joi.number()).required(),
        pin: Joi.string().length(4).required(),
      },
    },
    {
      method: "post",
      path: "/request-sms-code",
      handler: posControllers.requestSmsVerification,
      description: "인증번호를 발송합니다",
      needAuth: true,
      validateSchema: {
        phoneNumber: Joi.string().required(),
        pin: Joi.string().required(),
      },
    },
    {
      method: "post",
      path: "/validate-sms-code",
      handler: posControllers.validateSmsVerification,
      description: "인증번호를 확인합니다",
      needAuth: true,
      validateSchema: {
        smsCode: Joi.string().required(),
        phoneNumber: Joi.string().required(),
      },
    },
  ],
});
