import { randomBytes } from "crypto";

export const csprng = () => {
  return randomBytes(4).readUInt32LE(0);
};
