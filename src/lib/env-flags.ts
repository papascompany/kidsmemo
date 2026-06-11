export function isEnabledEnvFlag(value: string | undefined) {
  return value === "true" || value === "1" || value === "yes" || value === "on";
}
