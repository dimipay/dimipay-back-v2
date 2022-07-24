import * as controllers from "./controllers";

import type { ServiceSchema } from "..";

export default <ServiceSchema>{
  name: "공지 정보 서비스",
  baseURL: "/notice",
  routes: [
    {
      method: "get",
      path: "/current",
      handler: controllers.getCurrentNotice,
      needAuth: false,
    },
  ],
};
