import * as controllers from "./controllers";

import type { ServiceSchema } from "..";

export default <ServiceSchema>{
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
};
