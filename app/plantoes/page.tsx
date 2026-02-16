import { ShiftTable } from "../../components/shifts/shift-table";
import { getShiftKpis, getShifts } from "./actions";

export const dynamic = "force-dynamic";

type PlantoesPageProps = {
  searchParams: {
    page?: string;
    pageSize?: string;
    status?: "ALL" | "OPEN" | "CONFIRMED" | "COMPLETED";
  };
};

export default async function PlantoesPage({ searchParams }: PlantoesPageProps) {
  const page = Number(searchParams.page ?? "1");
  const pageSize = Number(searchParams.pageSize ?? "10");
  const status = searchParams.status ?? "ALL";

  const [list, kpis] = await Promise.all([
    getShifts({ page, pageSize, status }),
    getShiftKpis(),
  ]);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-5 lg:block">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">DutyMD</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Painel Medico</h2>
          </div>
          <nav className="space-y-1">
            <a className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" href="/agenda">
              Agenda de disponibilidade
            </a>
            <a className="block rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700" href="/plantoes">
              Meus plantoes
            </a>
            <a className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" href="/dashboard">
              Dashboard
            </a>
          </nav>
        </div>
      </aside>

      <main className="bg-slate-50 p-6">
        <div className="mx-auto max-w-[1320px] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Meus plantoes</h1>
              <p className="text-sm text-slate-600">Acompanhe oportunidades, confirmacoes e historico em uma visao unica.</p>
            </div>
          </div>

          <ShiftTable
            rows={list.rows}
            total={list.total}
            page={list.page}
            pageSize={list.pageSize}
            status={list.status}
            monthlyEarnings={kpis.monthlyEarnings}
            nextShift={kpis.nextShift}
          />
        </div>
      </main>
    </div>
  );
}
