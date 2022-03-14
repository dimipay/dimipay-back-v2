import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";

export default createService({
  name: "이벤트",
  baseURL: "/event",
  routes: [
    {
      handler: controllers.getEvents,
      method: "get",
      path: "/",
      needAuth: true,
    },
  ],
});
