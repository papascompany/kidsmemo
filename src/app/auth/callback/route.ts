import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOnboardingStatus } from "@/lib/onboarding";
import { createSupabaseRouteClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");

  if (oauthError || !code) {
    return redirectToLogin(requestUrl, "oauth");
  }

  const supabase = createSupabaseRouteClient(await cookies());
  if (!supabase) {
    return redirectToLogin(requestUrl, "config");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectToLogin(requestUrl, "oauth");
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return redirectToLogin(requestUrl, "oauth");
  }

  try {
    const status = await getOnboardingStatus(session.access_token);
    return NextResponse.redirect(new URL(status.memberships.length > 0 ? "/app" : "/onboarding", requestUrl.origin));
  } catch {
    return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
  }
}

function redirectToLogin(requestUrl: URL, reason: "config" | "oauth") {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("auth_error", reason);
  return NextResponse.redirect(loginUrl);
}
