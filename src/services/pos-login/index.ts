import * as controllers from "./controllers";
import Joi from "joi";

import type { ServiceSchema } from "..";

export default <ServiceSchema>{
  name: "키오스크 단말기 로그인",
  baseURL: "/pos-login",
  routes: [
    {
      method: "post",
      path: "/",
      description: "",
      handler: controllers.createPosTokenFromKey,
      needAuth: false,
      validateSchema: {
        passcode: Joi.string().required().length(4),
      },
    },
    {
      method: "post",
      path: "/refresh",
      description: "",
      handler: controllers.refreshPosToken,
      needAuth: false,
    },
    {
      method: "get",
      path: "/health",
      description: "",
      handler: controllers.healthCheck,
      needAuth: true,
    },
  ],
};
