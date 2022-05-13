import config from "@src/config";
import { createClient } from "redis";

let redisIntance: ReturnType<typeof createClient>;

export async function loadRedis() {
  if (redisIntance) return redisIntance;

  const client = createClient({
    url: config.redisUri,
  });
  await client.connect();

  redisIntance = client;
  return client;
}

export const key = {
  smsCode: (systemId: string) => `sms:${systemId}`,
  approvalCode: (hashedCode: string) => `approval:${hashedCode}`,
  approvalResponse: (id: string) => `approvalResponse:${id}`,
};
