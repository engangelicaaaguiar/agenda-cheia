"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server";
import { OnboardingProfileInputSchema, type OnboardingProfileInput } from "../types/onboarding";

type SaveOnboardingResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

async function updateProfileWithFallback(userId: string, payload: OnboardingProfileInput): Promise<string | null> {
  const supabase = createClient();

  // First try schema that uses `crm` + `role`.
  const primaryUpdate = await supabase
    .from("profiles")
    .update({
      full_name: payload.fullName,
      crm: payload.crm,
      crm_state: payload.crmState,
      role: payload.role,
    })
    .eq("id", userId);

  if (!primaryUpdate.error) {
    return null;
  }

  // Fallback for legacy column naming (`crm_number`) if `crm` does not exist.
  const fallbackUpdate = await supabase
    .from("profiles")
    .update({
      full_name: payload.fullName,
      crm_number: payload.crm,
      crm_state: payload.crmState,
    })
    .eq("id", userId);

  if (fallbackUpdate.error) {
    return fallbackUpdate.error.message;
  }

  return null;
}

export async function saveUserProfileOnboarding(input: OnboardingProfileInput): Promise<SaveOnboardingResult> {
  const parsed = OnboardingProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados invalidos para onboarding.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const payload = parsed.data;
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sessao invalida. Faca login novamente." };
  }

  const profileError = await updateProfileWithFallback(user.id, payload);
  if (profileError) {
    return { ok: false, error: profileError };
  }

  // Optional metadata persistence for onboarding proof.
  // This block is best-effort and does not fail onboarding if table is absent.
  await supabase.from("onboarding_documents").insert(
    payload.documentNames.map((name) => ({
      user_id: user.id,
      file_name: name,
    })),
  );

  revalidatePath("/dashboard");
  return { ok: true };
}
