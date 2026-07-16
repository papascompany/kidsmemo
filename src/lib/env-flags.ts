export function isEnabledEnvFlag(value: string | undefined) {
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

export function isLiveSupabaseMode() {
  return (
    process.env.KIDSMEMO_DATA_BACKEND === "supabase" &&
    isEnabledEnvFlag(process.env.KIDSMEMO_ALLOW_LIVE_SUPABASE)
  );
}

export function isMockRuntimeAllowed() {
  return process.env.NODE_ENV !== "production" || isEnabledEnvFlag(process.env.KIDSMEMO_ALLOW_MOCK_RUNTIME);
}
