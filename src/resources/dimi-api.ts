import axios from "axios";
import config from "@src/config";
import { LoginInfo, UserIdentity } from "@src/interfaces";

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
};
