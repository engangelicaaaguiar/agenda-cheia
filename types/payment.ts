import { z } from "zod";

export const WalletTransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["CREDIT", "DEBIT", "PAYOUT"]),
  status: z.enum(["PENDING", "SETTLED", "FAILED"]),
  amount: z.number(),
  description: z.string().nullable().optional(),
  created_at: z.string(),
});

export const PayoutRequestSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  status: z.enum(["REQUESTED", "PROCESSING", "PAID", "FAILED"]),
  payout_eta: z.string().nullable().optional(),
  created_at: z.string(),
});

export const PayoutInputSchema = z.object({
  amount: z.number().positive(),
});

export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;
export type PayoutRequest = z.infer<typeof PayoutRequestSchema>;
