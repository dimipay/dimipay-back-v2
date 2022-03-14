import axios from "axios";
import config from "@src/config";
import { LoginInfo, UserIdentity } from "@src/interfaces";
import { HttpException } from "@src/exceptions";

const apiRouter = {
  getIdentity: "/users/identify",
  getStudentInfo: "/user-students",
};

const api = axios.create({
  baseURL: config.dimi.baseUrl,
  headers: {
    Authorization: `Basic ${Buffer.from(
      `${config.dimi.apiId}:${config.dimi.apiPw}`
    ).toString("base64")}`,
  },
});

export const getIdentity = async (
  account: LoginInfo
): Promise<{ apiData: UserIdentity; status: number }> => {
  try {
    const { data: apiData, status } = await api.get(apiRouter.getIdentity, {
      params: account,
    });
    if (apiData.user_type === "S") {
      const { data: studentInfo, status: studentInfoStatus } = await api.get(
        `${apiRouter.getStudentInfo}/${apiData.username}`
      );
      apiData.studentNumber = studentInfo.serial;
    } else {
      apiData.studentNumber = null;
    }
    return { apiData, status };
  } catch (e) {
    if (e.response.status === 404)
      throw new HttpException(403, "아이디 또는 비밀번호가 일치하지 않습니다.");
    throw new HttpException(e.response.status, e.message);
  }
};
