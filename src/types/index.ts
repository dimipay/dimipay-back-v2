import { Request } from "express";

export type HTTPMethod = "get" | "post" | "put" | "patch" | "delete";

export const DimiUserTypeValues = ["S", "G", "O", "D", "T", "P"] as const;
export type DimiUserType = typeof DimiUserTypeValues[number];

export const GenderValues = ["M", "F"] as const;
export type Gender = typeof GenderValues[number];

export const TokenTypeValues = ["REFRESH", "ACCESS"];
export type TokenType = typeof TokenTypeValues[number];

export type ReqWithBody<T> = Request<unknown, unknown, T>;

export interface CardInfo {
  cardNumber: string;
  validMonth: number;
  validYear: number;
}
