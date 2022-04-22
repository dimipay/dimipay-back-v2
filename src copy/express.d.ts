import { PosDevice, User } from "@prisma/client";

declare global {
  namespace Express {
    export interface Request {
      user?: User;
      pos?: PosDevice;
    }
  }
}
