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
    },
    {
      method: "get",
      path: "/search/:search",
      handler: controllers.getUserbySearch,
      description: "",
      needAuth: true,
    },
    {
      method: "get",
      path: "/certkey",
      handler: controllers.getUserCertkey,
      description: "결제 요청에 필요한 인증키를 발급합니다.",
      needAuth: true,
    },
    {
      method: "post",
      path: "/approvalToken",
      handler: controllers.getUserbyApprovalToken,
      description: "결제에 필요한 유저 정보를 반환합니다.",
      needAuth: true,
      permission: ["Pos"],
    },
  ],
});
