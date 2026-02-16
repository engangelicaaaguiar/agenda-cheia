"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import type { PayoutRequest, WalletTransaction } from "../../types/payment";
import { requestPayout } from "./actions";

type RecebimentosClientProps = {
  availableBalance: number;
  pendingBalance: number;
  monthSettled: number;
  transactions: WalletTransaction[];
  payouts: PayoutRequest[];
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function RecebimentosClient({
  availableBalance,
  pendingBalance,
  monthSettled,
  transactions,
  payouts,
}: RecebimentosClientProps) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRequestPayout() {
    const parsedAmount = Number(amount.replace(",", "."));
    setSaving(true);
    setMessage(null);
    const result = await requestPayout(parsedAmount);
    setSaving(false);
    setMessage(result.ok ? "Solicitacao registrada com sucesso." : result.error ?? "Falha ao solicitar saque.");
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardDescription>Saldo disponivel</CardDescription>
            <CardTitle>{brl.format(availableBalance)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saldo pendente</CardDescription>
            <CardTitle>{brl.format(pendingBalance)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recebido no mes</CardDescription>
            <CardTitle>{brl.format(monthSettled)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitar recebimento</CardTitle>
          <CardDescription>Transferencia automatica com previsao D+2.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="h-10 rounded-md border border-slate-300 px-3 text-sm md:w-64"
            placeholder="Ex: 350.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Button type="button" onClick={handleRequestPayout} disabled={saving}>
            {saving ? "Enviando..." : "Solicitar saque"}
          </Button>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Extrato da carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Data</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{dateFmt.format(new Date(tx.created_at))}</td>
                      <td className="px-2 py-2">{tx.type}</td>
                      <td className="px-2 py-2">{tx.status}</td>
                      <td className="px-2 py-2 font-medium">{brl.format(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historico de recebimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Solicitacao</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Previsao</th>
                    <th className="px-2 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{dateFmt.format(new Date(payout.created_at))}</td>
                      <td className="px-2 py-2">{payout.status}</td>
                      <td className="px-2 py-2">{payout.payout_eta ?? "-"}</td>
                      <td className="px-2 py-2 font-medium">{brl.format(payout.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
