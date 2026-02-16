import { z } from "zod";

export const DoctorProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(120).nullable(),
  crmNumber: z.string().min(1).max(20).nullable(),
  crmState: z.string().length(2).nullable(),
  defaultOrganizationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DoctorProfile = z.infer<typeof DoctorProfileSchema>;
