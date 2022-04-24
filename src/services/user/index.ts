import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";

export default createService({
  name: "사용자 정보 서비스",
  baseURL: "/user",
  routes: [
    {
      method: "get",
      path: "/me",
      handler: controllers.getMyInfo,
      description: "내 정보 조회",
      needAuth: true,
    },
    {
      method: "get",
      path: "/search/:search",
      handler: controllers.getUserbySearch,
      description: "키워드로 사용자 검색",
      needAuth: true,
    },
    {
      method: "get",
      path: "/certkey",
      handler: controllers.getUserCertkey,
      description: "결제 요청에 필요한 인증키를 발급합니다.",
      needAuth: true,
      permission: ["Student", "Teacher"],
    },
    {
      method: "post",
      path: "/approval-code",
      handler: controllers.getUserbyApprovalCode,
      description: "일반결제에 필요한 유저 정보를 반환합니다.",
      needAuth: true,
      permission: ["Pos"],
      validateSchema: {
        approvalCode: Joi.string().required(),
      },
    },
    {
      method: "post",
      path: "/purchase-code",
      handler: controllers.getUserbyPurchaseCode,
      description: "특수결제에 필요한 유저 정보를 반환합니다.",
      needAuth: true,
      permission: ["Pos"],
      validateSchema: {
        purchaseCode: Joi.string().required(),
        purchaseType: Joi.string().required(),
      },
    },
  ],
});
