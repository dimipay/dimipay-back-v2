import bcrypt from "bcrypt";
import { HttpException } from "@src/exceptions";
import { prisma, createToken, logger } from "@src/resources";

import type { Request, Response } from "express";

export default async (req: Request, res: Response) => {
  try {
    const { body } = req;

    const current = await prisma.user.findUnique({
      where: { systemId: req.user.systemId },
      select: { paymentPin: true, deviceUid: true, bioKey: true },
    });

    // signed user
    if (current.paymentPin) {
      // right pin
      if (bcrypt.compareSync(body.paymentPin, current.paymentPin)) {
        // preparioopdate
        let newBioKey: string, newDeviceUid: string;
        if (current.bioKey !== body.bioKey) {
          newBioKey = bcrypt.hashSync(body.bioKey, 10);
        }
        if (current.deviceUid !== body.deviceUid) {
          newDeviceUid = body.deviceUid;
        }
        if (newBioKey || newDeviceUid) {
          await prisma.user.update({
            where: { systemId: req.user.systemId },
            data: {
              ...(newBioKey && { bioKey: newBioKey }),
              ...(newDeviceUid && { deviceUid: newDeviceUid }),
            },
          });
        }
        return res.json(createToken(req.user.systemId));
      } else {
        return res.status(401).json({
          code: "ERR_WRONG_PAYMENT_PIN",
          message: "잘못된 PIN입니다.",
        });
      }
    }

    // new user
    await prisma.user.update({
      where: { systemId: req.user.systemId },
      data: {
        deviceUid: body.deviceUid,
        bioKey: bcrypt.hashSync(body.bioKey, 10),
        paymentPin: bcrypt.hashSync(body.paymentPin, 10),
      },
    });

    logger.info(`${req.user.systemId}님의 결제 비밀번호가 등록되었어요.`);

    return res.status(201).json(createToken(req.user.systemId));
  } catch (e) {
    throw new HttpException(e.status, e.message);
  }
};
