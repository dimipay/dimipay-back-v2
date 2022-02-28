import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";

export default createService({
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
        Authkey: Joi.string().required(),
      },
      permission: ["Pos"],
    },
    {
      method: "post",
      path: "/refresh",
      description: "",
      handler: controllers.refreshPosToken,
      needAuth: false,
      permission: ["Pos"],
    },
  ],
});
