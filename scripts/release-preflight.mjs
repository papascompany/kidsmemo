const DEFAULT_PRODUCTION_URL = "https://kidsmemo.vercel.app";

const COMMON_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const PROFILES = {
  guards: {
    targetEnv: "KIDSMEMO_GUARD_SMOKE_BASE_URL",
    requiredEnv: []
  },
  "admin-live": {
    targetEnv: "KIDSMEMO_ADMIN_SMOKE_BASE_URL",
    requiredEnv: ["KIDSMEMO_ADMIN_EMAIL", "KIDSMEMO_ADMIN_PASSWORD"]
  },
  "admin-operations": {
    targetEnv: "KIDSMEMO_ADMIN_OPERATIONS_SMOKE_BASE_URL",
    requiredEnv: ["KIDSMEMO_ADMIN_EMAIL", "KIDSMEMO_ADMIN_PASSWORD"]
  },
  "organization-cms": {
    targetEnv: "KIDSMEMO_CMS_SMOKE_BASE_URL",
    requiredEnv: [
      "KIDSMEMO_ADMIN_EMAIL",
      "KIDSMEMO_ADMIN_PASSWORD",
      "KIDSMEMO_TEACHER_EMAIL",
      "KIDSMEMO_TEACHER_PASSWORD"
    ]
  },
  "onboarding-invite": {
    targetEnv: "KIDSMEMO_ONBOARDING_SMOKE_BASE_URL",
    requiredEnv: [
      "SUPABASE_SERVICE_ROLE_KEY",
      "KIDSMEMO_ONBOARDING_OWNER_EMAIL",
      "KIDSMEMO_ONBOARDING_OWNER_PASSWORD",
      "KIDSMEMO_ONBOARDING_JOINER_EMAIL",
      "KIDSMEMO_ONBOARDING_JOINER_PASSWORD"
    ]
  },
  "staff-coupon": {
    targetEnv: "KIDSMEMO_E2E_BASE_URL",
    requiredEnv: [
      "SUPABASE_SERVICE_ROLE_KEY",
      "KIDSMEMO_E2E_ADMIN_EMAIL",
      "KIDSMEMO_E2E_ADMIN_PASSWORD",
      "KIDSMEMO_E2E_STAFF_EMAIL",
      "KIDSMEMO_E2E_STAFF_PASSWORD",
      "KIDSMEMO_E2E_OTHER_STAFF_EMAIL",
      "KIDSMEMO_E2E_OTHER_STAFF_PASSWORD"
    ]
  },
  "browser-auth": {
    targetEnv: "KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL",
    requiredEnv: ["KIDSMEMO_ADMIN_EMAIL", "KIDSMEMO_ADMIN_PASSWORD"]
  }
};

const profileName = readOption("--profile") || readEnv("KIDSMEMO_RELEASE_PROFILE");
const target = readEnv("KIDSMEMO_RELEASE_TARGET").toLowerCase();
const releaseBaseUrl = readEnv("KIDSMEMO_RELEASE_BASE_URL");
const appUrl = readEnv("NEXT_PUBLIC_APP_URL");

try {
  main();
} catch (error) {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

function main() {
  const profile = PROFILES[profileName];
  if (!profile) {
    throw new Error(`KIDSMEMO_RELEASE_PROFILE must be one of: ${Object.keys(PROFILES).join(", ")}.`);
  }

  const requiredEnv = unique([
    "KIDSMEMO_RELEASE_TARGET",
    "KIDSMEMO_RELEASE_BASE_URL",
    "NEXT_PUBLIC_APP_URL",
    profile.targetEnv,
    ...(profileName === "guards" ? [] : COMMON_ENV),
    ...profile.requiredEnv
  ]);
  const missing = requiredEnv.filter((name) => !hasEnv(name));
  if (missing.length > 0) {
    throw new Error(`Missing required env names: ${missing.join(", ")}`);
  }

  assertTarget(target);
  const targetUrl = parseUrl(releaseBaseUrl, "KIDSMEMO_RELEASE_BASE_URL");
  const expectedAppUrl = parseUrl(appUrl, "NEXT_PUBLIC_APP_URL");
  const smokeUrl = parseUrl(readEnv(profile.targetEnv), profile.targetEnv);
  const productionUrl = parseUrl(
    readEnv("KIDSMEMO_RELEASE_PRODUCTION_URL") || DEFAULT_PRODUCTION_URL,
    "KIDSMEMO_RELEASE_PRODUCTION_URL"
  );

  validateTargetUrl(targetUrl, target, "KIDSMEMO_RELEASE_BASE_URL");
  validateHttpsOrLocal(targetUrl, "KIDSMEMO_RELEASE_BASE_URL", target === "local");
  validateHttpsOrLocal(expectedAppUrl, "NEXT_PUBLIC_APP_URL", target === "local");
  validateHttpsOrLocal(smokeUrl, profile.targetEnv, target === "local");
  validateHttpsOrLocal(productionUrl, "KIDSMEMO_RELEASE_PRODUCTION_URL", false);

  if (!sameOrigin(targetUrl, expectedAppUrl)) {
    throw new Error("KIDSMEMO_RELEASE_BASE_URL and NEXT_PUBLIC_APP_URL must identify the same target.");
  }
  if (!sameOrigin(targetUrl, smokeUrl)) {
    throw new Error(`${profile.targetEnv} must identify the same target as KIDSMEMO_RELEASE_BASE_URL.`);
  }
  if (target === "production" && !sameOrigin(targetUrl, productionUrl)) {
    throw new Error("production target must match KIDSMEMO_RELEASE_PRODUCTION_URL.");
  }
  if (target === "preview" && sameOrigin(targetUrl, productionUrl)) {
    throw new Error("preview target must be different from KIDSMEMO_RELEASE_PRODUCTION_URL.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        profile: profileName,
        target,
        checkedEnvNames: requiredEnv,
        presentEnvNames: requiredEnv,
        targetSeparation: {
          appUrlMatchesReleaseBase: true,
          smokeUrlMatchesReleaseBase: true,
          productionUrlMatchesReleaseBase: target === "production",
          previewDiffersFromProduction: target !== "preview" || !sameOrigin(targetUrl, productionUrl)
        }
      },
      null,
      2
    )
  );
}

function assertTarget(value) {
  if (!["local", "preview", "production"].includes(value)) {
    throw new Error("KIDSMEMO_RELEASE_TARGET must be local, preview, or production.");
  }
}

function validateTargetUrl(url, targetType, name) {
  const local = isLocalHost(url.hostname);
  if (targetType === "local" && !local) {
    throw new Error(`${name} must use a localhost target when KIDSMEMO_RELEASE_TARGET is local.`);
  }
  if (targetType !== "local" && local) {
    throw new Error(`${name} must not use a localhost target for ${targetType}.`);
  }
}

function validateHttpsOrLocal(url, name, allowLocalHttp) {
  const local = isLocalHost(url.hostname);
  if (url.protocol !== "https:" && !(allowLocalHttp && local && url.protocol === "http:")) {
    throw new Error(`${name} must use HTTPS; HTTP is allowed only for local targets.`);
  }
}

function parseUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must not contain credentials, query parameters, or fragments.`);
  }
  return url;
}

function sameOrigin(left, right) {
  return left.origin === right.origin;
}

function isLocalHost(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function hasEnv(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

function readEnv(name) {
  return process.env[name]?.trim() || "";
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() || "" : "";
}

function unique(values) {
  return [...new Set(values)];
}
