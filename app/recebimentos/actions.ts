"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { PayoutInputSchema, type PayoutRequest, type WalletTransaction } from "../../types/payment";

export type WalletSummary = {
  availableBalance: number;
  pendingBalance: number;
  monthSettled: number;
};

export async function getWalletSummary(): Promise<WalletSummary> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { availableBalance: 0, pendingBalance: 0, monthSettled: 0 };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase.from("doctor_wallets").select("available_balance,pending_balance").eq("doctor_id", user.id).maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("doctor_id", user.id)
      .eq("status", "SETTLED")
      .eq("type", "CREDIT")
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  return {
    availableBalance: Number(wallet?.available_balance ?? 0),
    pendingBalance: Number(wallet?.pending_balance ?? 0),
    monthSettled: (transactions ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
  };
}

export async function getTransactions(limit = 12): Promise<WalletTransaction[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("wallet_transactions")
    .select("id,type,status,amount,description,created_at")
    .eq("doctor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as WalletTransaction[]) ?? [];
}

export async function getPayoutRequests(limit = 8): Promise<PayoutRequest[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("payout_requests")
    .select("id,amount,status,payout_eta,created_at")
    .eq("doctor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as PayoutRequest[]) ?? [];
}

export async function requestPayout(amountInput: number): Promise<{ ok: boolean; error?: string }> {
  const parsed = PayoutInputSchema.safeParse({ amount: amountInput });
  if (!parsed.success) return { ok: false, error: "Valor invalido para saque." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sessao invalida." };

  const { data: wallet } = await supabase
    .from("doctor_wallets")
    .select("available_balance,pending_balance")
    .eq("doctor_id", user.id)
    .maybeSingle();

  const available = Number(wallet?.available_balance ?? 0);
  if (available < parsed.data.amount) {
    return { ok: false, error: "Saldo insuficiente para solicitar saque." };
  }

  const payoutEta = new Date();
  payoutEta.setDate(payoutEta.getDate() + 2);

  const [insertResult, updateWalletResult, insertTxResult] = await Promise.all([
    supabase.from("payout_requests").insert({
      doctor_id: user.id,
      amount: parsed.data.amount,
      status: "REQUESTED",
      payout_eta: payoutEta.toISOString().slice(0, 10),
    }),
    supabase
      .from("doctor_wallets")
      .update({
        available_balance: Math.max(0, available - parsed.data.amount),
        pending_balance: Number(wallet?.pending_balance ?? 0) + parsed.data.amount,
      })
      .eq("doctor_id", user.id),
    supabase.from("wallet_transactions").insert({
      doctor_id: user.id,
      type: "PAYOUT",
      status: "PENDING",
      amount: parsed.data.amount,
      description: "Solicitacao de saque D+2",
      available_on: payoutEta.toISOString().slice(0, 10),
    }),
  ]);

  if (insertResult.error || updateWalletResult.error || insertTxResult.error) {
    return { ok: false, error: "Nao foi possivel registrar o saque agora." };
  }

  revalidatePath("/recebimentos");
  revalidatePath("/dashboard");
  return { ok: true };
}
