import { Request, Response, NextFunction } from "express";
import { verify as veriToken } from "@src/resources";

const attachIdentity = async (
  req: Request,
  Res: Response,
  next: NextFunction
) => {
  if (!req.token) {
    return next();
  }
  const { token } = req;
  try {
    const identity = await veriToken(token);
    if (identity) {
      if (identity.systemId) req.user = identity;
      else req.pos = identity;
    }
    next();
  } catch (e) {
    return next(e);
  }
};

export default attachIdentity;
