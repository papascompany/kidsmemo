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
  const scope = {
    organizationId: "",
    attendanceDate: futureDate(14),
    className: `${qaPrefix}-CLASS`
  };
  const childName = `${qaPrefix}-CHILD`;
  const note = `${qaPrefix} attendance note`;

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

  let cleanupCompleted = false;

  try {
    await assertAnonymous401("/api/admin/organizations?limit=1");
    console.log("[PASS] anonymous organization lookup is rejected");

    await assertAnonymous401(attendanceUrl({ ...scope, organizationId: randomUUID() }));
    console.log("[PASS] anonymous attendance lookup is rejected");

    const organizations = await listOrganizations(accessToken);
    assert(Array.isArray(organizations), "organizations response must include an array");
    assert(organizations.length > 0, "admin organizations lookup returned no organizations");
    scope.organizationId = config.organizationId || organizations[0].id;
    assert(scope.organizationId, "selected organization did not include an id");
    console.log(`[PASS] admin listed organizations (${organizations.length})`);

    if (config.organizationId) {
      const selected = await listOrganizations(accessToken, config.organizationId);
      assert(
        selected.some((organization) => organization.id === config.organizationId),
        "configured organization id was not visible to the admin account"
      );
      console.log("[PASS] configured organization is visible to admin");
    }

    const initialRoster = await getAttendance(accessToken, scope);
    assertAttendanceRoster(initialRoster, scope);
    assert(initialRoster.isClosed === false, "fresh QA attendance scope should start open");
    console.log("[PASS] admin attendance GET returned the QA scope");

    await setAttendanceStatus(accessToken, { ...scope, action: "reopen" }, false);
    console.log("[PASS] admin reopened attendance scope");

    const saved = await putAttendance(accessToken, {
      ...scope,
      records: [
        {
          childName,
          status: "late",
          note
        }
      ]
    });
    assert(saved.saved === true, "attendance PUT did not report saved=true");
    assert(saved.count === 1, "attendance PUT did not report one saved record");
    console.log("[PASS] admin attendance PUT saved a QA record");

    const afterPut = await getAttendance(accessToken, scope);
    assertRosterRecord(afterPut, childName, "late", note);
    console.log("[PASS] admin attendance GET returned the saved QA record");

    const closed = await setAttendanceStatus(accessToken, { ...scope, action: "close" }, true);
    assert(closed.isClosed === true, "attendance close did not set isClosed=true");
    console.log("[PASS] admin closed attendance scope");

    const blockedWrite = await requestJson("/api/admin/attendance", {
      method: "PUT",
      accessToken,
      body: {
        ...scope,
        records: [
          {
            childName,
            status: "present",
            note: `${qaPrefix} should be blocked while closed`
          }
        ]
      },
      expectedStatuses: [409]
    });
    assert(
      blockedWrite.error?.code === "attendance_closed",
      `closed attendance PUT returned unexpected error code: ${blockedWrite.error?.code ?? "missing"}`
    );
    console.log("[PASS] closed attendance scope rejects PUT");

    const reopened = await setAttendanceStatus(accessToken, { ...scope, action: "reopen" }, false);
    assert(reopened.isClosed === false, "attendance reopen did not set isClosed=false");
    console.log("[PASS] admin reopened attendance scope after close");

    if (!config.keepRecord) {
      await cleanupQaRecords(supabase, scope, childName);
      cleanupCompleted = true;
      console.log("[PASS] cleaned up QA attendance records");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl: normalizeBaseUrl(config.baseUrl),
          checks: [
            "admin_login",
            "anonymous_401",
            "admin_organizations_get",
            "attendance_get",
            "attendance_put",
            "attendance_close",
            "attendance_closed_write_rejected",
            "attendance_reopen"
          ],
          organizationId: scope.organizationId,
          attendanceDate: scope.attendanceDate,
          className: scope.className,
          cleanup: config.keepRecord ? "kept_by_request" : "deleted"
        },
        null,
        2
      )
    );
  } finally {
    if (!config.keepRecord && scope.organizationId && !cleanupCompleted) {
      try {
        await cleanupQaRecords(supabase, scope, childName);
      } catch (error) {
        console.error(`[WARN] cleanup may be incomplete: ${redact(errorMessage(error))}`);
      }
    }
    await supabase.auth.signOut();
  }
}

async function listOrganizations(accessToken, organizationId) {
  const query = organizationId ? `id=${encodeURIComponent(organizationId)}&limit=1` : "limit=20";
  const response = await requestJson(`/api/admin/organizations?${query}`, { accessToken });
  return response.data?.organizations;
}

async function getAttendance(accessToken, scope) {
  const response = await requestJson(attendanceUrl(scope), { accessToken });
  return response.data;
}

async function putAttendance(accessToken, body) {
  const response = await requestJson("/api/admin/attendance", {
    method: "PUT",
    accessToken,
    body
  });
  return response.data;
}

async function setAttendanceStatus(accessToken, body, expectedClosed) {
  const response = await requestJson("/api/admin/attendance/status", {
    method: "PATCH",
    accessToken,
    body
  });
  assert(response.data?.updated === true, `attendance ${body.action} did not report updated=true`);
  assert(response.data?.isClosed === expectedClosed, `attendance ${body.action} returned the wrong closure state`);
  return response.data;
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

async function cleanupQaRecords(supabase, scope, childName) {
  const records = await supabase
    .from("attendance_records")
    .delete()
    .eq("organization_id", scope.organizationId)
    .eq("attendance_date", scope.attendanceDate)
    .eq("class_name", scope.className)
    .eq("child_name", childName);
  if (records.error) throw new Error(`attendance_records cleanup failed: ${records.error.message}`);

  const closures = await supabase
    .from("attendance_closures")
    .delete()
    .eq("organization_id", scope.organizationId)
    .eq("attendance_date", scope.attendanceDate)
    .eq("class_name", scope.className);
  if (closures.error) throw new Error(`attendance_closures cleanup failed: ${closures.error.message}`);
}

function attendanceUrl(scope) {
  const query = new URLSearchParams({
    organizationId: scope.organizationId,
    attendanceDate: scope.attendanceDate,
    className: scope.className
  });
  return `/api/admin/attendance?${query.toString()}`;
}

function assertAttendanceRoster(roster, scope) {
  assert(roster?.organizationId === scope.organizationId, "attendance roster organization did not match");
  assert(roster?.attendanceDate === scope.attendanceDate, "attendance roster date did not match");
  assert(roster?.className === scope.className, "attendance roster class did not match");
  assert(Array.isArray(roster?.roster), "attendance roster must include a roster array");
}

function assertRosterRecord(roster, childName, status, note) {
  const record = roster?.roster?.find((item) => item?.childName === childName);
  assert(record, "saved QA attendance record was not returned by GET");
  assert(record.status === status, `saved QA attendance status was ${record.status}, expected ${status}`);
  assert(record.note === note, "saved QA attendance note did not match");
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
