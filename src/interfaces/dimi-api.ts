import { DimiUserType, Gender } from "@src/types";

export type StringBody<T extends string> = Record<T, string>;

export type GoogleLoginInfo = Record<"idToken", string>;
export type LoginInfo = Record<
  "pin" | "deviceUid" | "bioKey" | "username" | "password",
  string
>;
export type ChangePayInfo = Partial<
  StringBody<"token" | "paymentPin" | "deviceUid" | "bioKey"> & {
    newToken: boolean;
  }
>;

export interface UserIdentity {
  id: number;
  username: string;
  email: string;
  name: string;
  nick: string;
  gender: Gender;
  studentNumber: string | null; // 학번
  user_type: DimiUserType;
  birthdate: string | null;
  phone: string | null;
  status: number;
  photofile1: string | null;
  photofile2: string | null;
  created_at: string;
  updated_at: string;
  password_hash: null;
  sso_token: string | null;
}
