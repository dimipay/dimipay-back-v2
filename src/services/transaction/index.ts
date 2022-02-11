import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";

export default createService({
  name: "결제 이력 서비스",
  baseURL: "/transaction",
  routes: [
    {
      method: "get",
      path: "/my",
      handler: controllers.getTransactionHistories,
      needAuth: true,
      needPermission: false,
      validateSchema: {
        lastId: Joi.number().optional(),
        amount: Joi.number(),
      },
    },
  ],
});
