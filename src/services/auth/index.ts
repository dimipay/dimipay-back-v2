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
      description:
        "username과 password로 Access Token과 Refresh Token을 발급합니다.",
      validateSchema: {
        username: Joi.string().required(),
        password: Joi.string().required(),
      },
    },
    {
      method: "post",
      path: "/refresh",
      handler: controllers.refreshAccessToken,
      description:
        "Refresh Token으로 Access Token을 재발급합니다. Refresh Token을 Bearer Header에 넣어서 보내주세요.",
      needAuth: false,
      needPermission: false,
    },
  ],
});
