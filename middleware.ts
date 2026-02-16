import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboardRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Intercept everything except framework/static assets and auth callback endpoint.
    "/((?!_next|static|auth/callback|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
