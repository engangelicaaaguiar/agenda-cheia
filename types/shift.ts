import { z } from "zod";

export const ShiftStatusSchema = z.enum(["OPEN", "ASSIGNED", "COMPLETED", "CANCELLED"]);

export const ShiftSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(4000).nullable(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    status: ShiftStatusSchema,
    doctorId: z.string().uuid().nullable(),
    createdBy: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine((value) => new Date(value.startsAt).getTime() < new Date(value.endsAt).getTime(), {
    message: "startsAt must be before endsAt",
    path: ["endsAt"],
  });

export type Shift = z.infer<typeof ShiftSchema>;
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;
