import Joi from "joi";
import * as controllers from "./controllers";
import { createService } from "../index";

export default createService({
  name: "인증 서비스",
  baseURL: "/auth",
  routes: [
    {
      method: "post",
      path: "/login",
      handler: controllers.identifyUser,
      needAuth: false,
      needPermission: false,
      validateSchema: {
        username: Joi.string().min(3).required(),
        password: Joi.string(),
      },
    },
    {
      method: "post",
      path: "/refresh",
      handler: controllers.refreshAccessToken,
      needAuth: false,
      needPermission: false,
    },
  ],
});
