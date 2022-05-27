import axios from "axios";
import config from "@src/config";
import { LoginInfo, UserIdentity } from "@src/interfaces";
import { HttpException } from "@src/exceptions";
import { v4 as uuidv4 } from "uuid";
import { DimiUserType, Gender } from "@src/types";

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

export const _getIdentity = async (
  account: LoginInfo
): Promise<{ apiData: UserIdentity; status: number }> => {
  try {
    const { username, password } = account;
    const { data: apiData, status } = await api.get(apiRouter.getIdentity, {
      params: { username, password },
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

export const getIdentity = async (
  account: LoginInfo
): Promise<{ apiData: UserIdentity; status: number }> => {
  try {
    const apiData = {
      id: 3,
      username: account.username,
      email: `${account.username}@dimipay.io`,
      name: "최재현",
      nick: "최재현",
      gender: "M" as Gender,
      user_type: "S" as DimiUserType,
      studentNumber: null as any, // 학번
      birthdate: null as any,
      phone: null as any,
      status: 200,
      photofile1: null as any,
      photofile2: null as any,
      created_at: new Date().toDateString(),
      updated_at: new Date().toDateString(),
      password_hash: null as any,
      sso_token: null as any,
    };
    return { apiData, status: 200 };
  } catch (e) {
    if (e.response.status === 404)
      throw new HttpException(403, "아이디 또는 비밀번호가 일치하지 않습니다.");
    throw new HttpException(e.response.status, e.message);
  }
};
