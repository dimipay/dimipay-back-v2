//Redis Pub/Sub, SSE
import { HttpException } from "@src/exceptions";
import { key, loadRedis } from "@src/resources";
import { Request, Response } from "express";

export const approvalResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const client = (await loadRedis()).duplicate();
    await client.connect();
    const redisKey = key.approvalResponse(id);

    const headers = {
      //headers for SSE
      "Content-Type": "text/event-stream",
      "Connection": "keep-alive",
      "Cache-Control": "no-cache",
    };
    res.writeHead(200, headers);

    client.subscribe(redisKey, (message) => {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    });

    req.on("close", () => {
      client.unsubscribe(redisKey);
      return res.end();
    });
  } catch (e) {
    throw new HttpException(e.message, e.status);
  }
};
