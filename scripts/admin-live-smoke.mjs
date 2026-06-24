import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = 20_000;

const config = {
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminEmail: readEnv("KIDSMEMO_ADMIN_EMAIL"),
  adminPassword: readEnv("KIDSMEMO_ADMIN_PASSWORD"),
  baseUrl: readEnv("KIDSMEMO_ADMIN_SMOKE_BASE_URL") || DEFAULT_BASE_URL,
  keepRecord: readEnv("KIDSMEMO_ADMIN_SMOKE_KEEP_RECORD").toLowerCase() === "true"
};

const secrets = [config.supabaseAnonKey, config.adminEmail, config.adminPassword].filter(Boolean);

main().catch((error) => {
  console.error(`Admin live smoke failed: ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();

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
  if (authError) throw new Error(`Supabase login failed: ${authError.message}`);

  const accessToken = authData.session?.access_token;
  if (!accessToken) throw new Error("Supabase login succeeded without an access token.");

  const marker = createMarker();
  let createdId = null;
  let cleanupCompleted = false;

  try {
    const initial = await apiRequest("GET", accessToken);
    assertOperationsPayload(initial);

    const created = await apiRequest("POST", accessToken, {
      resource: "pushCampaigns",
      payload: {
        organizationId: null,
        title: marker,
        body: "Automated admin live smoke record. Safe to delete.",
        targetRole: null,
        status: "draft",
        scheduledFor: null
      }
    });
    assertSavedMutation(created, "draft");
    createdId = created.item.id;

    const afterCreate = await apiRequest("GET", accessToken);
    assertCampaign(afterCreate, createdId, marker, "draft");

    const updated = await apiRequest("POST", accessToken, {
      resource: "pushCampaigns",
      payload: {
        id: createdId,
        organizationId: null,
        title: marker,
        body: "Automated admin live smoke record. Update verified; safe to delete.",
        targetRole: null,
        status: "cancelled",
        scheduledFor: null
      }
    });
    assertSavedMutation(updated, "cancelled", createdId);

    const afterUpdate = await apiRequest("GET", accessToken);
    assertCampaign(afterUpdate, createdId, marker, "cancelled");

    if (!config.keepRecord) {
      const { error: cleanupError } = await supabase.from("push_campaigns").delete().eq("id", createdId);
      if (cleanupError) throw new Error(`Smoke record cleanup failed for ${createdId}: ${cleanupError.message}`);
      cleanupCompleted = true;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl: normalizeBaseUrl(config.baseUrl),
          checks: ["supabase_login", "admin_operations_get", "admin_create", "admin_update", "get_persistence"],
          resource: "pushCampaigns",
          recordId: createdId,
          finalStatus: "cancelled",
          cleanup: config.keepRecord ? "kept_by_request" : "deleted"
        },
        null,
        2
      )
    );
  } finally {
    if (createdId && !config.keepRecord && !cleanupCompleted) {
      const { error } = await supabase.from("push_campaigns").delete().eq("id", createdId);
      if (error) {
        console.error(`Cleanup warning: record ${createdId} may remain (${redact(error.message)}).`);
      }
    }
    await supabase.auth.signOut();
  }
}

async function apiRequest(method, accessToken, body) {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/api/admin/operations`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} /api/admin/operations returned non-JSON (HTTP ${response.status}).`);
  }

  if (!response.ok || payload?.ok !== true) {
    const code = payload?.error?.code || "unexpected_response";
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`${method} /api/admin/operations failed: ${code}: ${message}`);
  }

  return payload.data;
}

function assertOperationsPayload(data) {
  const collections = [
    "contentBlocks",
    "mediaAssets",
    "attendanceRecords",
    "giftCodes",
    "staffCoupons",
    "pushCampaigns",
    "auditLogs"
  ];
  const missing = collections.filter((key) => !Array.isArray(data?.[key]));
  if (missing.length > 0) {
    throw new Error(`Admin GET response is missing collections: ${missing.join(", ")}`);
  }
}

function assertSavedMutation(data, expectedStatus, expectedId) {
  if (data?.saved !== true) {
    const reason = data?.reason ? ` (${data.reason})` : "";
    throw new Error(`Admin save was not persisted${reason}. Production may still be in mock mode.`);
  }
  if (data.resource !== "pushCampaigns" || !data.item?.id || data.item.status !== expectedStatus) {
    throw new Error(`Admin save returned an unexpected pushCampaigns payload for status ${expectedStatus}.`);
  }
  if (expectedId && data.item.id !== expectedId) {
    throw new Error(`Admin update returned a different record id (expected ${expectedId}).`);
  }
}

function assertCampaign(data, id, marker, status) {
  assertOperationsPayload(data);
  const campaign = data.pushCampaigns.find((item) => item?.id === id);
  if (!campaign) throw new Error(`Saved smoke record ${id} was not returned by admin GET.`);
  if (campaign.title !== marker || campaign.status !== status) {
    throw new Error(`Saved smoke record ${id} did not persist the expected ${status} state.`);
  }
}

function validateConfig() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: config.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: config.supabaseAnonKey,
    KIDSMEMO_ADMIN_EMAIL: config.adminEmail,
    KIDSMEMO_ADMIN_PASSWORD: config.adminPassword
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }

  validateUrl(config.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  validateUrl(config.baseUrl, "KIDSMEMO_ADMIN_SMOKE_BASE_URL");
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

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function createMarker() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const nonce = crypto.randomUUID().slice(0, 8);
  return `[admin-live-smoke] ${timestamp}-${nonce}`;
}

function readEnv(key) {
  return process.env[key]?.trim() || "";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function redact(value) {
  return secrets.reduce((result, secret) => result.split(secret).join("[REDACTED]"), value);
}
