import config from "@src/config";
import { HttpException } from "@src/exceptions";
import axios from "axios";
import CryptoJS from "crypto-js";

function createSignature() {
  const date = Date.now().toString();
  const uri = config.navercloud.smsServiceId;
  const secretKey = config.navercloud.smsKey; // Secret Key
  const accessKey = config.navercloud.accessKey; //Access Key
  const method = "POST";
  const space = " ";
  const newLine = "\n";
  const url2 = `/sms/v2/services/${uri}/messages`;
  const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
  hmac.update(method);
  hmac.update(space);
  hmac.update(url2);
  hmac.update(newLine);
  hmac.update(date);
  hmac.update(newLine);
  hmac.update(accessKey);
  const hash = hmac.finalize();

  return hash.toString(CryptoJS.enc.Base64);
}

export const sendSms = async (phoneNumber: string, content: string) => {
  const signature = createSignature();
  const url = `https://sens.apigw.ntruss.com/sms/v2/services/${config.navercloud.smsServiceId}/messages`;

  const result = await axios.post(
    url,
    {
      type: "SMS",
      countryCode: phoneNumber.split(" ")[0].slice(1),
      content,
      messages: [{ to: phoneNumber.split(" ")[1] }],
      from: config.navercloud.smsSendingNumber,
    },
    {
      headers: {
        "x-ncp-iam-access-key": config.navercloud.accessKey,
        "x-ncp-apigw-timestamp": +new Date(),
        "x-ncp-apigw-signature-v2": signature,
      },
    }
  );

  if (result.data.statusCode === 202) return;

  throw new HttpException(500, "문자 발송에 실패했어요");
};
