import dotenv from "dotenv";

const env = dotenv.config();
if (!env) throw new Error(".env file not exist");

const config = {
  redisUri: process.env.REDIS_URI,
  port: process.env.PORT!,
  jwtSecret: process.env.JWT_SECRET!,

  notionToken: process.env.NOTION_TOKEN!,
  notionPageId: process.env.NOTION_PAGE_ID!,

  dimi: {
    baseUrl: process.env.DIMIAPI_BASEURL!,
    apiId: process.env.DIMIAPI_ID!,
    apiPw: process.env.DIMIAPI_PW!,
  },

  navercloud: {
    smsServiceId: process.env.NAVER_SMS_API_SERVICE_ID!,
    smsUri: process.env.NAVER_SMS_API_URI!,
    secretKey: process.env.NAVER_API_SECRET_KEY!,
    accessKey: process.env.NAVER_API_ACCESS_KEY!,
    smsSendingNumber: process.env.NAVER_SMS_SENDING_NUMBER!,
  },
};

type Config = {
  [key: string]: string | Config;
};

function checkEnvs(tree: Config) {
  Object.keys(tree).forEach((key) => {
    if (typeof tree[key] === "object") {
      checkEnvs(tree[key] as Config);
    }
    if (!tree[key]) {
      throw new Error(`"${key}" is not defined in env var`);
    }
  });
}

checkEnvs(config);

export default config;
