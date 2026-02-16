import { z } from "zod";

export const ShiftStatusSchema = z.enum(["OPEN", "CONFIRMED", "COMPLETED"]);

export const ShiftRowSchema = z.object({
  id: z.string().uuid(),
  hospital_name: z.string().min(1),
  hospital_address: z.string().nullable().optional(),
  checkin_instructions: z.string().nullable().optional(),
  start_time: z.string(),
  end_time: z.string(),
  status: ShiftStatusSchema,
  value: z.number(),
});

export const ShiftQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(50).default(10),
  status: z.enum(["ALL", "OPEN", "CONFIRMED", "COMPLETED"]).default("ALL"),
});

export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;
export type ShiftRow = z.infer<typeof ShiftRowSchema>;
export type ShiftQuery = z.infer<typeof ShiftQuerySchema>;
