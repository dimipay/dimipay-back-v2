import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";

export default createService({
  name: "쿠폰 구매/조회 서비스",
  baseURL: "/coupons",
  routes: [
    {
      method: "get",
      path: "/",
      handler: controllers.getRecivedCoupons,
      needAuth: true,
      permission: ["Student"],
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
      validateSchema: {
        name: Joi.string(),
        to: Joi.array().items(Joi.string().required()).min(1).required(),
        amount: Joi.number().min(300).required(),
        expiresAt: Joi.date(),
      },
    },
  ],
});
