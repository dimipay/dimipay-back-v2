import { HttpException } from "@src/exceptions";

export default (status: number, message: string) => {
  return () => new HttpException(status, message);
};
