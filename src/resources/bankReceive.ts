import axios from "axios";
import config from "@src/config";
import { BankTransaction } from "@src/interfaces";
import { HttpException } from "@src/exceptions";

type origin = "origin1" | "origin2";
const getTransactions = async (origin: origin) => {
  const url = config.bankOrigin[origin];
  const { data } = await axios({
    method: "GET",
    url: url,
    headers: {
      Authorization: `Bearer ${config.bankKey}`,
    },
  });
  return data as BankTransaction[];
};

export const checkValidTransaction = async (
  origin: origin,
  amount: number,
  billingId: string | null
) => {
  const tTime = billingId ? new Date(parseInt(billingId)) : null;
  const transactions = await getTransactions(origin);
  const transaction = transactions.find((t) => t.amount >= amount);
  // transaction 리스트가 시간순 정렬이기 때문에 가장 최근 transaction을 반환함
  if (!transaction || new Date(transaction.date) <= tTime)
    throw new HttpException(404, "송금 기록을 확인하지 못했어요.");

  return transaction;
};
