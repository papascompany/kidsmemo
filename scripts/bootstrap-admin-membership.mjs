const readEnv = (key) => process.env[key]?.trim();

process.env.KIDSMEMO_BOOTSTRAP_EMAIL =
  readEnv("KIDSMEMO_ADMIN_EMAIL") ||
  readEnv("KIDSMEMO_BOOTSTRAP_EMAIL") ||
  "kidsmemo.admin.test@storige.co.kr";
process.env.KIDSMEMO_BOOTSTRAP_PASSWORD =
  readEnv("KIDSMEMO_ADMIN_PASSWORD") ||
  readEnv("KIDSMEMO_BOOTSTRAP_PASSWORD") ||
  "KidsmemoAdmin!2026";
process.env.KIDSMEMO_BOOTSTRAP_PROFILE_NAME =
  readEnv("KIDSMEMO_ADMIN_PROFILE_NAME") ||
  readEnv("KIDSMEMO_BOOTSTRAP_PROFILE_NAME") ||
  "키즈메모 플랫폼 관리자";
process.env.KIDSMEMO_BOOTSTRAP_PHONE =
  readEnv("KIDSMEMO_ADMIN_PHONE") || readEnv("KIDSMEMO_BOOTSTRAP_PHONE") || "";
process.env.KIDSMEMO_BOOTSTRAP_ORG_NAME =
  readEnv("KIDSMEMO_ADMIN_ORG_NAME") || "키즈메모 플랫폼 운영";
process.env.KIDSMEMO_BOOTSTRAP_ORG_TYPE =
  readEnv("KIDSMEMO_ADMIN_ORG_TYPE") || "daycare";
process.env.KIDSMEMO_BOOTSTRAP_ORG_REGION =
  readEnv("KIDSMEMO_ADMIN_ORG_REGION") || "플랫폼";
process.env.KIDSMEMO_BOOTSTRAP_ROLE = "admin";
process.env.KIDSMEMO_BOOTSTRAP_SEED_EVENT = "false";

await import("./bootstrap-test-membership.mjs");
