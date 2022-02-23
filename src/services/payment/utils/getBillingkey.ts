import { CardInfo } from "@src/types";

export const getBillingkey = async (card: CardInfo) => {
  // 정기결제 추가를 위한 함수입니다.
  // 적당히.. 잘 처리해주세요
  // TODO

  await new Promise((r) => setTimeout(r, 1000));

  return {
    name: "국민카드",
    billingKey: "FAKE_123456789",
  };
};
