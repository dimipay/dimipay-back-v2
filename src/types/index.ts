export type HTTPMethod = "get" | "post" | "put" | "patch" | "delete";

export const UserTypeValues = [] as const;
export type UserType = typeof UserTypeValues[number];
