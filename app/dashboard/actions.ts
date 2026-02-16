"use server";

import { createClient } from "../../lib/supabase/server";

export type DoctorJourneyState = {
  onboardingComplete: boolean;
  hasAvailability: boolean;
  shiftsConfirmed: number;
  availableBalance: number;
  pendingBalance: number;
};

export async function getDoctorJourneyState(): Promise<DoctorJourneyState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      onboardingComplete: false,
      hasAvailability: false,
      shiftsConfirmed: 0,
      availableBalance: 0,
      pendingBalance: 0,
    };
  }

  const [{ data: profile }, { count: availabilityCount }, { count: shiftsConfirmed }, { data: wallet }] =
    await Promise.all([
      supabase.from("profiles").select("role,crm,crm_number").eq("id", user.id).maybeSingle(),
      supabase.from("doctor_availability").select("id", { count: "exact", head: true }).eq("doctor_id", user.id),
      supabase
        .from("shifts")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", user.id)
        .in("status", ["OPEN", "CONFIRMED"]),
      supabase
        .from("doctor_wallets")
        .select("available_balance,pending_balance")
        .eq("doctor_id", user.id)
        .maybeSingle(),
    ]);

  const role = typeof profile?.role === "string" ? profile.role : null;
  const crm = typeof profile?.crm === "string" ? profile.crm : typeof profile?.crm_number === "string" ? profile.crm_number : null;
  const onboardingComplete = role === "DOCTOR" && Boolean(crm);

  return {
    onboardingComplete,
    hasAvailability: (availabilityCount ?? 0) > 0,
    shiftsConfirmed: shiftsConfirmed ?? 0,
    availableBalance: Number(wallet?.available_balance ?? 0),
    pendingBalance: Number(wallet?.pending_balance ?? 0),
  };
}
