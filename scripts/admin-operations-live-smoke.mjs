import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = 20_000;

const config = {
  baseUrl: readEnv("KIDSMEMO_ADMIN_OPERATIONS_SMOKE_BASE_URL", DEFAULT_BASE_URL),
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminEmail: readEnv("KIDSMEMO_ADMIN_EMAIL"),
  adminPassword: readEnv("KIDSMEMO_ADMIN_PASSWORD"),
  organizationId: readEnv("KIDSMEMO_ADMIN_OPERATIONS_SMOKE_ORGANIZATION_ID"),
  keepRecord: readEnv("KIDSMEMO_ADMIN_OPERATIONS_SMOKE_KEEP_RECORD").toLowerCase() === "true"
};

const secrets = [config.supabaseAnonKey, config.adminEmail, config.adminPassword].filter(Boolean);

main().catch((error) => {
  console.error(`[FAIL] ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();

  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const qaPrefix = `QA-ADMIN-OPERATIONS-LIVE-SMOKE-${runId}`;
  console.log(`[START] admin operations live smoke (${runId})`);

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: config.adminEmail,
    password: config.adminPassword
  });
  if (authError) throw new Error(`admin login failed: ${authError.message}`);

  const accessToken = authData.session?.access_token;
  if (!accessToken) throw new Error("admin login did not return an access token");

  try {
    await assertAnonymous401("/api/admin/organizations?limit=1");
    console.log("[PASS] anonymous organization lookup is rejected");

    const organizations = await listOrganizations(accessToken);
    assert(Array.isArray(organizations), "organizations response must include an array");
    assert(organizations.length > 0, "admin organizations lookup returned no organizations");
    console.log(`[PASS] admin listed organizations (${organizations.length})`);

    if (config.organizationId) {
      const selected = await listOrganizations(accessToken, config.organizationId);
      assert(
        selected.some((organization) => organization.id === config.organizationId),
        "configured organization id was not visible to the admin account"
      );
      console.log("[PASS] configured organization is visible to admin");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl: normalizeBaseUrl(config.baseUrl),
          checks: [
            "admin_login",
            "anonymous_401",
            "admin_organizations_get"
          ],
        },
        null,
        2
      )
    );
  } finally {
    await supabase.auth.signOut();
  }
}

async function listOrganizations(accessToken, organizationId) {
  const query = organizationId ? `id=${encodeURIComponent(organizationId)}&limit=1` : "limit=20";
  const response = await requestJson(`/api/admin/organizations?${query}`, { accessToken });
  return response.data?.organizations;
}

async function assertAnonymous401(path) {
  const response = await requestJson(path, {
    expectedStatuses: [401]
  });
  assert(
    response.error?.code === "authentication_required",
    `anonymous ${path} returned unexpected error code: ${response.error?.code ?? "missing"}`
  );
}

async function requestJson(path, options = {}) {
  const { method = "GET", accessToken, body, expectedStatuses = [200] } = options;
  const headers = new Headers({
    Accept: "application/json"
  });

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(new URL(path, normalizedBaseUrl()), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const payload = await parseJson(response, path);

  if (!expectedStatuses.includes(response.status)) {
    const errorCode = payload?.error?.code ?? "unknown_error";
    const errorMessage = payload?.error?.message ?? "No API error message";
    throw new Error(`${method} ${path} failed (${response.status}, ${errorCode}): ${errorMessage}`);
  }

  if (response.ok && payload?.ok !== true) {
    throw new Error(`${method} ${path} returned an invalid success envelope`);
  }
  if (!response.ok && payload?.ok !== false) {
    throw new Error(`${method} ${path} returned an invalid error envelope`);
  }

  return payload;
}

async function parseJson(response, path) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${path} returned non-JSON content (${response.status})`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${path} returned invalid JSON (${response.status})`);
  }
}

function validateConfig() {
  const missing = [];
  if (!config.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!config.supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!config.adminEmail) missing.push("KIDSMEMO_ADMIN_EMAIL");
  if (!config.adminPassword) missing.push("KIDSMEMO_ADMIN_PASSWORD");

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  validateUrl(config.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  validateUrl(config.baseUrl, "KIDSMEMO_ADMIN_OPERATIONS_SMOKE_BASE_URL");
}

function validateUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) {
    throw new Error(`${name} must use HTTPS (HTTP is allowed only for localhost).`);
  }
}

function normalizedBaseUrl() {
  return new URL(normalizeBaseUrl(config.baseUrl));
}

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function readEnv(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function redact(value) {
  return secrets.reduce((result, secret) => result.split(secret).join("[REDACTED]"), value);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
