import Joi from "joi";
import { createService } from "..";
import { getPaymentMethods } from "./controllers";

export default createService({
  name: "결제 서비스",
  baseURL: "/payment",
  routes: [
    {
      method: "post",
      handler: getPaymentMethods,
      needAuth: true,
      path: "/methods",
      needPermission: true,
      description: "결제수단 목록을 조회합니다",
      validateSchema: {
        isCreditOnly: Joi.boolean().optional(),
      },
    },
  ],
});
