import Joi from "joi";
import createJoiError from "@src/resources/createJoiError";
import { createService } from "..";
import {
  approvalResponse,
  getApprovalCode,
  paymentApproval,
  stageProducts,
} from "./controllers";
import {
  addGeneralPaymentmethod,
  createPrepaidCard,
  getPaymentMethods,
  deletePaymentMethod,
  updatePaymentMethod,
} from "./controllers/paymentMethod";
import { registerPaymentPin, resetPaymentPin } from "./controllers/paymentPin";
import { paymentToken } from "@src/middlewares";

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
      path: "/method/general",
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
      path: "/method/prepaid",
      description: "선불카드를 생성합니다",
      validateSchema: {
        name: Joi.string().required(),
        color: Joi.string().optional(),
      },
    },
    {
      method: "put",
      handler: updatePaymentMethod,
      needAuth: true,
      path: "/method/:id",
      description: "결제수단의 정보를 수정합니다",
      validateSchema: {
        name: Joi.string().optional(),
        color: Joi.string().optional(),
      },
    },
    {
      method: "delete",
      handler: deletePaymentMethod,
      needAuth: true,
      path: "/method/:id",
      description: "결제수단을 삭제합니다",
    },
    {
      method: "post",
      handler: getApprovalCode,
      needAuth: true,
      path: "/token",
      description: "앱 결제를 위한 코드를 생성합니다.",
      permission: ["Student", "Teacher"],
      middlewares: [paymentToken],
      validateSchema: {
        paymentMethod: Joi.string().required(),
      },
    },
    {
      method: "post",
      handler: getApprovalCode,
      needAuth: true,
      path: "/token/refresh",
      description: "앱 결제를 위한 코드를 리프레시합니다.",
      permission: ["Student", "Teacher"],
      validateSchema: {
        code: Joi.string().required(),
        paymentMethod: Joi.string().required(),
      },
    },
    {
      method: "post",
      handler: stageProducts,
      needAuth: true,
      path: "/approval",
      description: "실 결제 승인을 요청합니다.",
      permission: ["Pos"],
      validateSchema: {
        products: Joi.array()
          .items(
            Joi.object({
              productId: Joi.string().required(),
              amount: Joi.number().required(),
            })
          )
          .required(),
        userIdentity: Joi.object({
          systemId: Joi.string().required(),
          paymentMethod: Joi.string().required(),
          transactionMethod: Joi.string().required(),
        }),
      },
    },
    {
      method: "post",
      handler: paymentApproval,
      needAuth: true,
      path: "/checktransfer",
      description: "입금을 확인합니다.",
      permission: ["Pos"],
      validateSchema: {
        origin: Joi.string().required(),
        cancel: Joi.boolean(),
      },
    },
    {
      method: "post",
      handler: registerPaymentPin,
      needAuth: true,
      path: "/pin",
      description: "결제 비밀번호를 설정합니다.",
      permission: ["Student"],
      validateSchema: {
        paymentPin: Joi.string()
          .regex(/^\d{4}$/)
          .required()
          .error(createJoiError(400, "비밀번호 규칙에 맞춰 입력해주세요")),
      },
    },
    {
      method: "put",
      handler: resetPaymentPin,
      needAuth: true,
      path: "/pin",
      description: "결제 비밀번호를 변경합니다.",
      permission: ["Student"],
      validateSchema: {
        originalPin: Joi.string()
          .regex(/^\d{4}$/)
          .required()
          .error(createJoiError(400, "비밀번호 규칙에 맞춰 입력해주세요")),
        resetPin: Joi.string()
          .regex(/^\d{4}$/)
          .required()
          .error(createJoiError(400, "비밀번호 규칙에 맞춰 입력해주세요")),
      },
    },
    {
      method: "get",
      handler: approvalResponse,
      needAuth: true,
      path: "/response",
      description: "결제 승인 여부를 응답합니다.",
    },
  ],
});
