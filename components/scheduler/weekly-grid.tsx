"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addHours, format, startOfDay } from "date-fns";
import { cn } from "../../lib/utils";
import type { AvailabilitySlot } from "../../types/availability";

type WeeklyGridProps = {
  initialSlots?: AvailabilitySlot[];
  onSlotsChange: (slots: AvailabilitySlot[]) => void;
};

type DragMode = "select" | "deselect";

const dayColumns = [
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Dom", value: 0 },
];

const START_HOUR = 6;
const END_HOUR = 22;

function toKey(dayOfWeek: number, hour: number): string {
  return `${dayOfWeek}-${hour}`;
}

function timeToHour(value: string): number {
  const [hour] = value.split(":");
  return Number(hour);
}

function buildSelectedSet(slots: AvailabilitySlot[]): Set<string> {
  const selected = new Set<string>();
  slots.forEach((slot) => {
    const startHour = timeToHour(slot.startTime);
    const endHour = timeToHour(slot.endTime);
    for (let hour = startHour; hour < endHour; hour += 1) {
      selected.add(toKey(slot.dayOfWeek, hour));
    }
  });
  return selected;
}

function normalizeSlotsFromSet(selected: Set<string>): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];

  dayColumns.forEach((day) => {
    const selectedHours: number[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
      if (selected.has(toKey(day.value, hour))) selectedHours.push(hour);
    }

    if (selectedHours.length === 0) return;

    let rangeStart = selectedHours[0];
    let previous = selectedHours[0];

    for (let index = 1; index < selectedHours.length; index += 1) {
      const current = selectedHours[index];
      const isSequential = current === previous + 1;
      if (!isSequential) {
        slots.push({
          dayOfWeek: day.value,
          startTime: `${String(rangeStart).padStart(2, "0")}:00`,
          endTime: `${String(previous + 1).padStart(2, "0")}:00`,
          isRecurring: true,
        });
        rangeStart = current;
      }
      previous = current;
    }

    slots.push({
      dayOfWeek: day.value,
      startTime: `${String(rangeStart).padStart(2, "0")}:00`,
      endTime: `${String(previous + 1).padStart(2, "0")}:00`,
      isRecurring: true,
    });
  });

  return slots;
}

export function WeeklyGrid({ initialSlots = [], onSlotsChange }: WeeklyGridProps) {
  const [selected, setSelected] = useState<Set<string>>(() => buildSelectedSet(initialSlots));
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<DragMode>("select");

  const hours = useMemo(() => {
    const start = startOfDay(new Date());
    const labels: string[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
      labels.push(format(addHours(start, hour), "HH:mm"));
    }
    return labels;
  }, []);

  useEffect(() => {
    const normalized = normalizeSlotsFromSet(selected);
    onSlotsChange(normalized);
  }, [selected, onSlotsChange]);

  useEffect(() => {
    function stopDragging() {
      isDraggingRef.current = false;
    }
    window.addEventListener("mouseup", stopDragging);
    return () => window.removeEventListener("mouseup", stopDragging);
  }, []);

  function updateCell(dayOfWeek: number, hour: number, mode: DragMode) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = toKey(dayOfWeek, hour);
      if (mode === "select") next.add(key);
      if (mode === "deselect") next.delete(key);
      return next;
    });
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
          <div className="p-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Hora</div>
          {dayColumns.map((day) => (
            <div key={day.value} className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
              {day.label}
            </div>
          ))}
        </div>

        {hours.map((label, rowIndex) => {
          const hourValue = START_HOUR + rowIndex;
          return (
            <div
              key={label}
              className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-slate-100 last:border-b-0"
            >
              <div className="border-r border-slate-100 px-3 py-2 text-xs text-slate-500">{label}</div>
              {dayColumns.map((day) => {
                const key = toKey(day.value, hourValue);
                const active = selected.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "h-10 border-r border-slate-100 transition last:border-r-0",
                      active ? "bg-emerald-500/85 hover:bg-emerald-500" : "bg-white hover:bg-emerald-50",
                    )}
                    onMouseDown={() => {
                      isDraggingRef.current = true;
                      dragModeRef.current = active ? "deselect" : "select";
                      updateCell(day.value, hourValue, dragModeRef.current);
                    }}
                    onMouseEnter={() => {
                      if (!isDraggingRef.current) return;
                      updateCell(day.value, hourValue, dragModeRef.current);
                    }}
                    aria-label={`${day.label} ${label}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
