import { z } from "zod";

export const AppRoleSchema = z.enum(["OWNER", "ADMIN", "DOCTOR", "STAFF"]);

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160),
  slug: z.string().min(2).max(80),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OrganizationMemberSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: AppRoleSchema,
  createdAt: z.string().datetime(),
});

export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;
export type AppRole = z.infer<typeof AppRoleSchema>;
