import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";
import { paymentToken } from "@src/middlewares";

export default createService({
  name: "쿠폰 구매/조회 서비스",
  baseURL: "/coupons",
  routes: [
    {
      method: "get",
      path: "/all",
      description:
        "받은 전체 쿠폰을 조회합니다. (이미 사용된 쿠폰, 만료된 쿠폰 포함)",
      handler: controllers.getAllReceivedCoupons,
      needAuth: true,
    },
    {
      method: "get",
      path: "/",
      description: "현재 사용 가능한 쿠폰을 조회합니다.",
      handler: controllers.getVaildReceivedCoupons,
      needAuth: true,
    },
    {
      method: "get",
      path: "/issued",
      handler: controllers.getIssuedCoupons,
      needAuth: true,
      permission: ["Teacher"],
    },
    {
      method: "post",
      path: "/purchase",
      handler: controllers.purchaseCoupon,
      needAuth: true,
      permission: ["Teacher"],
      middlewares: [paymentToken],
      validateSchema: {
        purchaseType: Joi.string().required(),
        paymentMethod: Joi.string().required(),
        pin: Joi.string(),
        deviceKey: Joi.string(),
        extraFields: Joi.object({
          title: Joi.string(),
          to: Joi.array().items(Joi.string()).required(),
          amount: Joi.number().required(),
          expiresAt: Joi.date(),
        }),
      },
    },
  ],
});
