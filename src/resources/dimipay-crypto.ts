import axios from "axios";
import config from "@src/config";
import { Message, Cryptogram, Pubkey, EncryptedToken } from "@src/interfaces";
import { User } from "@prisma/client";
import { HttpException } from "@src/exceptions";

const apiRouter = {
  rsa: {
    getPublicKey: "/rsa/pubkey",
    encrypt: "/rsa/encrypt",
    decrypt: "/rsa/decrypt",
  },
  aes: {
    encrypt: "/aes-256/encrypt",
    decrypt: "/aes-256/decrypt",
  },
  paymentToken: {
    decrypt: "/payment-token/",
  },
};

const api = axios.create({
  baseURL: config.dimipayCrypto,
  headers: {
    Authorization: `Bearer ${config.cryptoAccessKey}`,
  },
});

const cryptoAPI = <T, L>(url: string) => {
  return async (body: T): Promise<L> => {
    try {
      const { data: apiData, status } = await api.post(url, {
        ...body,
      });
      return apiData;
    } catch (e) {
      throw new HttpException(e.response.status, e.message);
    }
  };
};

export const rsa = {
  pubkey: cryptoAPI<{ identity: Partial<User> }, Pubkey>(
    apiRouter.rsa.getPublicKey
  ),
  encrypt: cryptoAPI<Message, Cryptogram>(apiRouter.rsa.encrypt),
  decrypt: cryptoAPI<Cryptogram, Message>(apiRouter.rsa.decrypt),
};

export const aes = {
  encrypt: cryptoAPI<{ identity: Partial<User> } & Message, Cryptogram>(
    apiRouter.aes.encrypt
  ),
  decrypt: cryptoAPI<{ identity: Partial<User> } & Cryptogram, Message>(
    apiRouter.aes.decrypt
  ),
};

export const paymentToken = {
  decrypt: cryptoAPI<EncryptedToken, any>(apiRouter.paymentToken.decrypt),
};
