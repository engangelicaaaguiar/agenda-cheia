"use client";

import { useMemo, useState } from "react";
import { parse, isBefore } from "date-fns";
import { WeeklyGrid } from "../../components/scheduler/weekly-grid";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import type { AvailabilitySlot } from "../../types/availability";
import { saveAvailability } from "./actions";

type AgendaClientProps = {
  initialSlots: AvailabilitySlot[];
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

function hasOverlaps(slots: AvailabilitySlot[]): boolean {
  const grouped = new Map<number, AvailabilitySlot[]>();
  slots.forEach((slot) => {
    const current = grouped.get(slot.dayOfWeek) ?? [];
    current.push(slot);
    grouped.set(slot.dayOfWeek, current);
  });

  for (const daySlots of grouped.values()) {
    const sorted = [...daySlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      const currentStart = parse(current.startTime, "HH:mm", new Date());
      const currentEnd = parse(current.endTime, "HH:mm", new Date());
      if (!isBefore(currentStart, currentEnd)) return true;

      const next = sorted[index + 1];
      if (!next) continue;
      if (current.endTime > next.startTime) return true;
    }
  }

  return false;
}

export function AgendaClient({ initialSlots }: AgendaClientProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const hasSlots = useMemo(() => slots.length > 0, [slots]);

  function showToast(next: ToastState) {
    setToast(next);
    setTimeout(() => setToast(null), 3200);
  }

  async function handleSave() {
    if (!hasSlots) {
      showToast({ type: "error", message: "Selecione ao menos um horario na grade semanal." });
      return;
    }

    if (hasOverlaps(slots)) {
      showToast({ type: "error", message: "Existem horarios sobrepostos. Ajuste antes de salvar." });
      return;
    }

    setSaving(true);
    try {
      const result = await saveAvailability(slots);
      if (!result.ok) {
        showToast({ type: "error", message: result.error });
        return;
      }
      showToast({ type: "success", message: "Agenda salva com sucesso." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white p-5 lg:block">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">DutyMD</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Painel Medico</h2>
            </div>
            <nav className="space-y-1">
              <a className="block rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700" href="/agenda">
                Agenda de disponibilidade
              </a>
              <a className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" href="/dashboard">
                Dashboard
              </a>
            </nav>
          </div>
        </aside>

        <main className="bg-slate-50 p-6">
          <Card className="mx-auto max-w-[1280px]">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Gestao de Disponibilidade</CardTitle>
                <CardDescription>
                  Marque seus horarios recorrentes da semana. Clique e arraste para ganhar velocidade.
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alteracoes"}
              </Button>
            </CardHeader>
            <CardContent>
              <WeeklyGrid initialSlots={initialSlots} onSlotsChange={setSlots} />
            </CardContent>
          </Card>
        </main>
      </div>

      {toast ? (
        <div
          className={`fixed bottom-5 right-5 rounded-md px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
