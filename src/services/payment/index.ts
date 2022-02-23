import Joi from "joi";
import { createService } from "..";
import { addGeneralPaymentmethod, getPaymentMethods } from "./controllers";
import { createPrepaidCard } from "./controllers/createPrepaidCard";

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
  ],
});
