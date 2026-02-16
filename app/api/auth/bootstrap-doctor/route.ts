import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { bootstrapDoctorAccount } from "../../../../lib/auth/bootstrap-doctor";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await bootstrapDoctorAccount(user);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "bootstrap_failed" }, { status: 500 });
  }
}
