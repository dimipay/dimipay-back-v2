import * as controllers from "./controllers";
import Joi from "joi";

import type { ServiceSchema } from "..";

export default <ServiceSchema>{
  name: "결제 이력 서비스",
  baseURL: "/transaction",
  routes: [
    {
      method: "get",
      path: "/my",
      handler: controllers.getTransactionHistories,
      needAuth: true,
      validateSchema: {
        lastId: Joi.number().optional(),
        amount: Joi.number(),
      },
    },
    {
      handler: controllers.getMonthlyTransaction,
      method: "get",
      path: "/monthly/year/:year/month/:month",
      needAuth: true,
    },
  ],
};
