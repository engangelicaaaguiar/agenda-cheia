import { z } from "zod";

export const CrmValidationInputSchema = z.object({
  imageBase64: z.string().min(16),
  mimeType: z.string().min(3).max(100),
});

export const CrmValidationOutputSchema = z.object({
  status: z.enum(["valid", "invalid"]),
  extracted: z.object({
    fullName: z.string().min(1),
    crmNumber: z.string().min(1),
    crmState: z.string().length(2),
    confidence: z.number().min(0).max(1),
  }),
});

export const OnboardingProfileInputSchema = z.object({
  fullName: z.string().min(3).max(120),
  crm: z.string().min(4).max(20),
  crmState: z.string().length(2),
  rqe: z.string().max(30).optional(),
  ecpfLinked: z.boolean().optional(),
  role: z.enum(["DOCTOR", "ADMIN", "STAFF"]).default("DOCTOR"),
  specialties: z.array(z.string().min(2).max(80)).min(1),
  documentNames: z.array(z.string().min(1)).min(1),
});

export type CrmValidationInput = z.infer<typeof CrmValidationInputSchema>;
export type CrmValidationOutput = z.infer<typeof CrmValidationOutputSchema>;
export type OnboardingProfileInput = z.infer<typeof OnboardingProfileInputSchema>;
