import { HttpException } from "@src/exceptions";
import Joi from "joi";
import createJoiError from "@src/resources/createJoiError";
import { createService } from "..";
import {
  addGeneralPaymentmethod,
  getApprovalToken,
  getPaymentMethods,
  paymentApproval,
} from "./controllers";
import { createPrepaidCard } from "./controllers/createPrepaidCard";
import { registerPaymentPin, resetPaymentPin } from "./controllers/paymentPin";

export default createService({
  name: "결제 서비스",
  baseURL: "/payment",
  routes: [
    {
      method: "get",
      handler: getPaymentMethods,
      needAuth: true,
      path: "/method",
      description: "결제수단 목록을 조회합니다",
    },
    {
      method: "post",
      handler: addGeneralPaymentmethod,
      needAuth: true,
      path: "/method",
      description: "카드 결제수단을 추가합니다",
      validateSchema: {
        cardNumber: Joi.string().required(),
        validMonth: Joi.number().required(),
        validYear: Joi.number().required(),
      },
    },
    {
      method: "post",
      handler: createPrepaidCard,
      needAuth: true,
      path: "/create-prepaid",
      description: "선불카드를 생성합니다",
    },
    {
      method: "post",
      handler: getApprovalToken,
      needAuth: true,
      path: "/token",
      description: "앱 결제를 위한 토큰을 생성합니다.",
      permission: ["Student"],
      validateSchema: {
        token: Joi.string().required(),
      },
    },
    {
      method: "post",
      handler: paymentApproval,
      needAuth: true,
      path: "/approval",
      description: "실 결제 승인을 요청합니다.",
      permission: ["Pos"],
    },
    {
      method: "post",
      handler: registerPaymentPin,
      needAuth: true,
      path: "/register-pin",
      description: "실 결제 승인을 요청합니다.",
      permission: ["Student"],
      validateSchema: {
        paymentPin: Joi.string()
          .regex(/^\d{4}$/)
          .required()
          .error(createJoiError(400, "비밀번호 규칙에 맞춰 입력해주세요")),
      },
    },
    {
      method: "post",
      handler: resetPaymentPin,
      needAuth: true,
      path: "/reset-pin",
      description: "실 결제 승인을 요청합니다.",
      permission: ["Student"],
      validateSchema: {
        originalPin: Joi.string()
          .regex(/^\d{4}$/)
          .required()
          .error(createJoiError(400, "비밀번호 규칙에 맞춰 입력해주세요")),
        paymentPin: Joi.string()
          .regex(/^\d{4}$/)
          .required()
          .error(createJoiError(400, "비밀번호 규칙에 맞춰 입력해주세요")),
      },
    },
  ],
});
