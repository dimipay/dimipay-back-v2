import axios from "axios";
import config from "@src/config";
import { Account, UserIdentity } from "@src/interfaces";

const apiRouter = {
  getIdentity: "/users/identify",
  getStudentInfo: "/user-students",
};

const api = axios.create({
  auth: {
    username: config.dimi.apiId,
    password: config.dimi.apiPw,
  },
  baseURL: config.dimi.baseUrl,
});

export const getIdentity = async (
  account: Account
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
