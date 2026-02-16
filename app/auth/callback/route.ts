import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;
  const fallbackRedirect = `${origin}/dashboard`;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=session_missing`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.redirect(`${origin}/login?error=profile_lookup_failed`);
  }

  const roleValue = typeof profile?.role === "string" ? profile.role : null;
  const crmValue =
    typeof profile?.crm === "string"
      ? profile.crm
      : typeof profile?.crm_number === "string"
        ? profile.crm_number
        : null;

  const isIncomplete = !roleValue || !crmValue;
  const target = isIncomplete ? "/onboarding" : next || "/dashboard";

  return NextResponse.redirect(`${origin}${target || fallbackRedirect}`);
}
