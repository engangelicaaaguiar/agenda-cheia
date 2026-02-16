import { DoctorSidebar } from "../../components/layout/doctor-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { getDoctorJourneyState } from "./actions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const state = await getDoctorJourneyState();

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[250px_1fr]">
      <DoctorSidebar currentPath="/dashboard" />

      <main className="bg-slate-50 p-6">
        <div className="mx-auto max-w-[1320px] space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Jornada do Medico</h1>
            <p className="text-sm text-slate-600">Credenciamento, agenda, plantoes e recebimento em um fluxo unico.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Fase 1 - Cadastro</CardDescription>
                <CardTitle>{state.onboardingComplete ? "Concluida" : "Pendente"}</CardTitle>
              </CardHeader>
              <CardContent>
                <a className="text-sm font-medium text-emerald-700" href="/onboarding">
                  Ir para onboarding
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Fase 2 - Agenda</CardDescription>
                <CardTitle>{state.hasAvailability ? "Configurada" : "Sem disponibilidade"}</CardTitle>
              </CardHeader>
              <CardContent>
                <a className="text-sm font-medium text-emerald-700" href="/agenda">
                  Abrir agenda
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Fase 3 - Plantoes Ativos</CardDescription>
                <CardTitle>{state.shiftsConfirmed}</CardTitle>
              </CardHeader>
              <CardContent>
                <a className="text-sm font-medium text-emerald-700" href="/plantoes">
                  Ver plantoes
                </a>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardDescription>Fase 4 - Recebimento</CardDescription>
                <CardTitle>{brl.format(state.availableBalance)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-700">
                <p>Disponivel para saque</p>
                <p>Pendente: {brl.format(state.pendingBalance)}</p>
                <a className="font-medium text-emerald-700" href="/recebimentos">
                  Abrir carteira
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
