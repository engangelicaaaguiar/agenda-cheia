import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isLoginAudience, resolveAudienceRedirect, type LoginAudience } from "../../../lib/auth/login-audience";
import { bootstrapDoctorAccount } from "../../../lib/auth/bootstrap-doctor";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const audienceParam = requestUrl.searchParams.get("audience");
  const audience: LoginAudience = isLoginAudience(audienceParam) ? audienceParam : "doctor";
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

  if (audience === "doctor") {
    try {
      await bootstrapDoctorAccount(user);
    } catch {
      return NextResponse.redirect(`${origin}/login?error=doctor_bootstrap_failed&audience=doctor`);
    }
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

  const doctorNeedsOnboarding = audience === "doctor" && (!roleValue || !crmValue);
  if (doctorNeedsOnboarding) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  const audienceTarget = resolveAudienceRedirect(audience, roleValue);
  if (!audienceTarget) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=audience_not_allowed&audience=${audience}`);
  }

  const safeNext = next?.startsWith("/") ? next : null;
  const target = safeNext || audienceTarget;

  return NextResponse.redirect(`${origin}${target || fallbackRedirect}`);
}
