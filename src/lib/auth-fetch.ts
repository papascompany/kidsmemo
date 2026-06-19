"use client";

import { createSupabaseBrowserClient } from "./supabase";

type AuthenticatedFetchOptions = RequestInit & {
  organizationId?: string;
};

export async function authenticatedFetch(input: RequestInfo | URL, options: AuthenticatedFetchOptions = {}) {
  const { organizationId, headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (organizationId) {
    requestHeaders.set("x-kidmemo-organization-id", organizationId);
  }

  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return fetch(input, {
    ...init,
    headers: requestHeaders
  });
}
