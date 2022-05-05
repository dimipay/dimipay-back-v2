import { DimiUserType, Gender } from "@src/types";

export interface LoginInfo {
  username: string;
  password: string;
  pin: string;
  deviceUid: string;
  bioKey: string;
}

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
