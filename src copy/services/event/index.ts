import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";

export default createService({
  name: "이벤트",
  baseURL: "/event",
  routes: [
    {
      handler: controllers.getOngoingEvents,
      method: "get",
      path: "/ongoing",
      needAuth: true,
    },
    {
      handler: controllers.getUpcommingEvents,
      method: "get",
      path: "/upcomming",
      needAuth: true,
    },
    {
      handler: controllers.getPastEvents,
      method: "get",
      path: "/past/:page",
      needAuth: true,
    },
  ],
});
