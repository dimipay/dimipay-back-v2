import config from "@src/config";
import { HttpException } from "@src/exceptions";
import axios from "axios";
import CryptoJS from "crypto-js";

function makeSignature(
  secretKey: string,
  method: string,
  url: string,
  timestamp: string,
  accessKey: string
) {
  const space = " ";
  const newLine = "\n";
  const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
  hmac.update(method);
  hmac.update(space);
  hmac.update(url);
  hmac.update(newLine);
  hmac.update(timestamp);
  hmac.update(newLine);
  hmac.update(accessKey);
  const hash = hmac.finalize();
  return hash.toString(CryptoJS.enc.Base64);
}

export const sendSms = async (phoneNumber: string, content: string) => {
  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${encodeURIComponent(
    config.navercloud.smsServiceId
  )}/messages`;

  const signature = makeSignature(
    config.navercloud.secretKey,
    "POST",
    url,
    timestamp,
    config.navercloud.accessKey
  );

  const result = await axios({
    method: "POST",
    url: `https://sens.apigw.ntruss.com` + url,
    headers: {
      "x-ncp-iam-access-key": config.navercloud.accessKey,
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-apigw-signature-v2": signature,
    },
    data: {
      type: "SMS",
      countryCode: phoneNumber.split(" ")[0].slice(1),
      content,
      messages: [{ to: ("0" + phoneNumber.split(" ")[1]).split("-").join("") }],
      from: config.navercloud.smsSendingNumber,
    },
  });

  if (result.data.statusCode === "202") return;
  if (result.data.statuName === "success") return;

  throw new HttpException(500, "문자 발송에 실패했어요");
};
