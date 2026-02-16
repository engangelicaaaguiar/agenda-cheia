"use server";

import { revalidatePath } from "next/cache";
import { parse, isBefore } from "date-fns";
import { z } from "zod";
import { createClient } from "../../lib/supabase/server";
import { AvailabilitySlotsSchema, type AvailabilitySlot } from "../../types/availability";

type SaveAvailabilityResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

const AvailabilityPayloadSchema = z.object({
  slots: AvailabilitySlotsSchema,
});

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
      const slot = sorted[index];
      const start = parse(slot.startTime, "HH:mm", new Date());
      const end = parse(slot.endTime, "HH:mm", new Date());
      if (!isBefore(start, end)) return true;

      const next = sorted[index + 1];
      if (!next) continue;
      if (slot.endTime > next.startTime) return true;
    }
  }

  return false;
}

function toDbSlots(slots: AvailabilitySlot[]) {
  return slots.map((slot) => ({
    day_of_week: slot.dayOfWeek,
    start_time: slot.startTime,
    end_time: slot.endTime,
    is_recurring: slot.isRecurring,
  }));
}

export async function saveAvailability(slots: AvailabilitySlot[]): Promise<SaveAvailabilityResult> {
  const parsed = AvailabilityPayloadSchema.safeParse({ slots });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados de disponibilidade invalidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (hasOverlaps(parsed.data.slots)) {
    return { ok: false, error: "Existem horarios sobrepostos na grade." };
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sessao invalida. Faca login novamente." };
  }

  const dbSlots = toDbSlots(parsed.data.slots);

  const { error } = await supabase.rpc("replace_doctor_availability", {
    p_slots: dbSlots,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/agenda");
  return { ok: true };
}

export async function getAvailability(): Promise<AvailabilitySlot[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("doctor_availability")
    .select("day_of_week,start_time,end_time,is_recurring")
    .eq("doctor_id", user.id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    dayOfWeek: row.day_of_week,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    isRecurring: row.is_recurring,
  }));
}
