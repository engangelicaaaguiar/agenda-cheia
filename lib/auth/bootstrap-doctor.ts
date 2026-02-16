import { createAdminClient } from "../supabase/admin";

type DoctorBootstrapUser = {
  id: string;
  email?: string | null;
};

export async function bootstrapDoctorAccount(user: DoctorBootstrapUser): Promise<void> {
  const admin = createAdminClient();

  await admin.from("profiles").upsert(
    {
      id: user.id,
      role: "DOCTOR",
      email: user.email ?? null,
    },
    { onConflict: "id" },
  );

  await admin.from("doctor_wallets").upsert(
    {
      doctor_id: user.id,
      available_balance: 0,
      pending_balance: 0,
      currency: "BRL",
    },
    { onConflict: "doctor_id" },
  );

  await admin.from("doctor_compliance").upsert(
    {
      doctor_id: user.id,
      cfm_status: "PENDING",
      vault_ready: false,
      ecpf_linked: false,
    },
    { onConflict: "doctor_id" },
  );
}
