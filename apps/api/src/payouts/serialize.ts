import type { PayoutRequest } from "@prisma/client";

export interface PayoutRequestDto {
  id: string;
  amountCents: number;
  currency: string;
  status: PayoutRequest["status"];
  note: string | null;
  adminNote: string | null;
  requestedAt: Date;
  processedAt: Date | null;
}

export function toPayoutRequestDto(request: PayoutRequest): PayoutRequestDto {
  return {
    id: request.id,
    amountCents: request.amountCents,
    currency: request.currency,
    status: request.status,
    note: request.note,
    adminNote: request.adminNote,
    requestedAt: request.requestedAt,
    processedAt: request.processedAt,
  };
}
