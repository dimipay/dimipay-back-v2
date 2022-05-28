import * as controllers from "./controllers";
import { createService } from "../index";
import Joi from "joi";

export default createService({
  name: "사용자 정보 서비스",
  baseURL: "/user",
  routes: [
    {
      method: "get",
      path: "/me",
      handler: controllers.getMyInfo,
      description: "내 정보 조회",
      needAuth: true,
    },
    {
      method: "get",
      path: "/search/:search",
      handler: controllers.getUserbySearch,
      description: "키워드로 사용자 검색",
      needAuth: true,
    },
    {
      method: "get",
      path: "/code/:code",
      handler: controllers.getUserbyApprovalCode,
      description: "일반결제에 필요한 유저 정보를 반환합니다.",
      needAuth: true,
      permission: ["Pos"],
    },
  ],
});
