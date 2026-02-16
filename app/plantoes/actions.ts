"use server";

import { createClient } from "../../lib/supabase/server";
import { ShiftQuerySchema, type ShiftQuery, type ShiftRow } from "../../types/shift-dashboard";

type ShiftListResponse = {
  rows: ShiftRow[];
  total: number;
  page: number;
  pageSize: number;
  status: ShiftQuery["status"];
};

type ShiftKpiResponse = {
  monthlyEarnings: number;
  nextShift: ShiftRow | null;
};

export async function getShifts(params: Partial<ShiftQuery>): Promise<ShiftListResponse> {
  const parsed = ShiftQuerySchema.parse({
    page: Number(params.page ?? 1),
    pageSize: Number(params.pageSize ?? 10),
    status: params.status ?? "ALL",
  });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { rows: [], total: 0, page: parsed.page, pageSize: parsed.pageSize, status: parsed.status };
  }

  let query = supabase
    .from("shifts")
    .select("id,hospital_name,hospital_address,checkin_instructions,start_time,end_time,status,value", {
      count: "exact",
    })
    .eq("doctor_id", user.id)
    .order("start_time", { ascending: false });

  if (parsed.status !== "ALL") {
    query = query.eq("status", parsed.status);
  }

  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    return { rows: [], total: 0, page: parsed.page, pageSize: parsed.pageSize, status: parsed.status };
  }

  return {
    rows: data as ShiftRow[],
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
    status: parsed.status,
  };
}

export async function getShiftKpis(): Promise<ShiftKpiResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { monthlyEarnings: 0, nextShift: null };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const nowIso = new Date().toISOString();

  const [completedResult, nextResult] = await Promise.all([
    supabase
      .from("shifts")
      .select("value")
      .eq("doctor_id", user.id)
      .eq("status", "COMPLETED")
      .gte("start_time", startOfMonth.toISOString()),
    supabase
      .from("shifts")
      .select("id,hospital_name,hospital_address,checkin_instructions,start_time,end_time,status,value")
      .eq("doctor_id", user.id)
      .in("status", ["OPEN", "CONFIRMED"])
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const monthlyEarnings = (completedResult.data ?? []).reduce((acc, row) => acc + Number(row.value ?? 0), 0);

  return {
    monthlyEarnings,
    nextShift: (nextResult.data as ShiftRow | null) ?? null,
  };
}
