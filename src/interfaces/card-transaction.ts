import { PaymentMethod, GeneralCard, PrepaidCard } from "@prisma/client"

export interface TransactionPaymentMethod extends PaymentMethod {
    generalCard: GeneralCard;
    prepaidCard: PrepaidCard;
}