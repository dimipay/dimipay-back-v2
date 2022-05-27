import Joi from "joi";
import * as controllers from "./controllers";
import * as posControllers from "./pos-controllers";
import { createService } from "../index";

export default createService({
  name: "인증 서비스",
  baseURL: "/auth",
  routes: [
    {
      method: "post",
      path: "/login",
      handler: controllers.identifyUser,
      needAuth: false,
      description:
        "username과 password로 Access Token과 Refresh Token을 발급합니다.",
      validateSchema: {
        username: Joi.string().required(),
        password: Joi.string().required(),
        pin: Joi.string().required(),
        bioKey: Joi.string().required(),
        deviceUid: Joi.string().required(),
      },
    },
    {
      method: "post",
      path: "/refresh",
      handler: controllers.refreshAccessToken,
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
    // {
    //   method: "post",
    //   path: "/request-sms-code",
    //   handler: posControllers.requestSmsVerification,
    //   description: "인증번호를 발송합니다",
    //   needAuth: true,
    //   validateSchema: {
    //     studentNumber: Joi.string().required(),
    //     pin: Joi.string().required(),
    //   },
    // },
    // {
    //   method: "post",
    //   path: "/validate-sms-code",
    //   handler: posControllers.validateSmsVerification,
    //   description: "인증번호를 확인합니다",
    //   needAuth: true,
    //   validateSchema: {
    //     smsCode: Joi.string().required(),
    //     studentNumber: Joi.string().required(),
    //   },
    // },
  ],
});
