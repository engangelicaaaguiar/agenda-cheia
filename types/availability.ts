import { z } from "zod";

export const AvailabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isRecurring: z.boolean().default(true),
});

export const AvailabilitySlotsSchema = z.array(AvailabilitySlotSchema);

export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;
