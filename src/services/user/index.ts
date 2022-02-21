import * as controllers from "./controllers";
import { createService } from "../index";

export default createService({
  name: "사용자 정보 서비스",
  baseURL: "/user",
  routes: [
    {
      method: "get",
      path: "/me",
      handler: controllers.getMyInfo,
      description: "",
      needAuth: true,
      needPermission: false,
    },
  ],
});
