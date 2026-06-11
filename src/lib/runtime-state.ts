import { isEnabledEnvFlag } from "./env-flags";

export function getRuntimeBackendState() {
  const requestedBackend = process.env.KIDSMEMO_DATA_BACKEND ?? "mock";
  const liveSupabaseArmed = isEnabledEnvFlag(process.env.KIDSMEMO_ALLOW_LIVE_SUPABASE);
  const effectiveBackend = requestedBackend === "supabase" && liveSupabaseArmed ? "supabase" : "mock";

  return {
    requestedBackend,
    liveSupabaseArmed,
    effectiveBackend,
    modeLabel: effectiveBackend === "supabase" ? "Live Supabase" : "Mock Fallback",
    lockLabel: liveSupabaseArmed ? "Unlocked" : "Locked"
  } as const;
}
