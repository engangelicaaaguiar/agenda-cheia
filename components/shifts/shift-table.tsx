"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { ShiftQuery, ShiftRow, ShiftStatus } from "../../types/shift-dashboard";

type ShiftTableProps = {
  rows: ShiftRow[];
  total: number;
  page: number;
  pageSize: number;
  status: ShiftQuery["status"];
  monthlyEarnings: number;
  nextShift: ShiftRow | null;
};

const statusLabel: Record<ShiftStatus, string> = {
  OPEN: "Pendente",
  CONFIRMED: "Agendado",
  COMPLETED: "Realizado",
};

const statusClassName: Record<ShiftStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-slate-200 text-slate-700",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const columnHelper = createColumnHelper<ShiftRow>();

function formatCountDown(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: ptBR });
}

export function ShiftTable({ rows, total, page, pageSize, status, monthlyEarnings, nextShift }: ShiftTableProps) {
  const [selectedShift, setSelectedShift] = useState<ShiftRow | null>(null);
  const [pending, setPending] = useState(false);

  const columns = useMemo(
    () => [
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const value = getValue();
          return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClassName[value]}`}>{statusLabel[value]}</span>;
        },
      }),
      columnHelper.accessor("start_time", {
        header: "Data/Hora",
        cell: ({ row }) => {
          const start = new Date(row.original.start_time);
          const end = new Date(row.original.end_time);
          return (
            <div className="text-sm text-slate-700">
              <p className="font-medium">{dateTimeFormatter.format(start)}</p>
              <p className="text-xs text-slate-500">ate {dateTimeFormatter.format(end)}</p>
            </div>
          );
        },
      }),
      columnHelper.accessor("hospital_name", {
        header: "Hospital",
        cell: ({ getValue }) => <span className="text-sm text-slate-700">{getValue()}</span>,
      }),
      columnHelper.accessor("value", {
        header: "Valor",
        cell: ({ getValue }) => <span className="text-sm font-semibold text-slate-900">{currencyFormatter.format(getValue())}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Acoes",
        cell: ({ row }) => (
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedShift(row.original);
            }}
          >
            Ver detalhes
          </Button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  async function updateFilter(nextStatus: ShiftQuery["status"]) {
    setPending(true);
    const params = new URLSearchParams(window.location.search);
    params.set("status", nextStatus);
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    window.location.search = params.toString();
  }

  async function updatePagination(next: PaginationState) {
    setPending(true);
    const params = new URLSearchParams(window.location.search);
    params.set("status", status);
    params.set("page", String(next.pageIndex + 1));
    params.set("pageSize", String(next.pageSize));
    window.location.search = params.toString();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Ganhos no mes</CardDescription>
            <CardTitle>{currencyFormatter.format(monthlyEarnings)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardDescription>Proximo plantao</CardDescription>
            <CardTitle>{nextShift ? nextShift.hospital_name : "Sem plantao futuro"}</CardTitle>
            <p className="text-sm text-slate-600">
              {nextShift ? `${dateTimeFormatter.format(new Date(nextShift.start_time))} (${formatCountDown(nextShift.start_time)})` : "Abra oportunidades para aceitar novos plantoes."}
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Meus plantoes</CardTitle>
            <CardDescription>Visualize oportunidades, confirmacoes e historico.</CardDescription>
          </div>
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={status}
            onChange={(event) => updateFilter(event.target.value as ShiftQuery["status"])}
            disabled={pending}
          >
            <option value="ALL">Todos</option>
            <option value="CONFIRMED">Agendado</option>
            <option value="COMPLETED">Realizado</option>
            <option value="OPEN">Pendente</option>
          </select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-slate-200">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => setSelectedShift(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Pagina {page} de {totalPages} ({total} registros)
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={page <= 1 || pending}
                onClick={() =>
                  updatePagination({
                    pageIndex: Math.max(0, page - 2),
                    pageSize,
                  })
                }
              >
                Anterior
              </Button>
              <Button
                type="button"
                disabled={page >= totalPages || pending}
                onClick={() =>
                  updatePagination({
                    pageIndex: Math.min(totalPages - 1, page),
                    pageSize,
                  })
                }
              >
                Proxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedShift ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setSelectedShift(null)}>
          <aside
            className="h-full w-full max-w-md bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalhes do plantao</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedShift.hospital_name}</h3>
              </div>
              <button type="button" className="text-slate-500" onClick={() => setSelectedShift(null)}>
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">Horario</p>
                <p>{dateTimeFormatter.format(new Date(selectedShift.start_time))}</p>
                <p>ate {dateTimeFormatter.format(new Date(selectedShift.end_time))}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Endereco</p>
                <p>{selectedShift.hospital_address ?? "Endereco nao informado"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Check-in</p>
                <p>{selectedShift.checkin_instructions ?? "Sem instrucoes adicionais."}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Valor</p>
                <p>{currencyFormatter.format(selectedShift.value)}</p>
              </div>
            </div>

            <Button type="button" className="mt-8 w-full" onClick={() => alert("Fluxo de atendimento em implementacao") }>
              Iniciar atendimento
            </Button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

