import { User } from "./interfaces";

declare global {
  namespace Express {
    export interface Request {
      user?: User;
    }
  }
}
