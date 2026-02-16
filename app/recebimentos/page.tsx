import { DoctorSidebar } from "../../components/layout/doctor-sidebar";
import { RecebimentosClient } from "./recebimentos-client";
import { getPayoutRequests, getTransactions, getWalletSummary } from "./actions";

export const dynamic = "force-dynamic";

export default async function RecebimentosPage() {
  const [summary, transactions, payouts] = await Promise.all([
    getWalletSummary(),
    getTransactions(),
    getPayoutRequests(),
  ]);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[250px_1fr]">
      <DoctorSidebar currentPath="/recebimentos" />

      <main className="bg-slate-50 p-6">
        <div className="mx-auto max-w-[1320px] space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Recebimentos</h1>
            <p className="text-sm text-slate-600">Carteira digital, historico e solicitacoes de saque.</p>
          </div>

          <RecebimentosClient
            availableBalance={summary.availableBalance}
            pendingBalance={summary.pendingBalance}
            monthSettled={summary.monthSettled}
            transactions={transactions}
            payouts={payouts}
          />
        </div>
      </main>
    </div>
  );
}
