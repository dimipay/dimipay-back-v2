import { DimiUserType, Gender } from "@src/types";

type Body<T extends string> = Record<T, string>;

type LoginInfoBase = Body<"pin" | "deviceUid" | "bioKey">;

export type LoginInfo = LoginInfoBase & Body<"username" | "password">;
export type GoogleLoginIngo = LoginInfoBase &
  Body<"credential" | "g_csrf_token">;

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
