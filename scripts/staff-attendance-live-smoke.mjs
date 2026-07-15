import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = 20_000;

const config = {
  baseUrl: readEnv("KIDSMEMO_ATTENDANCE_SMOKE_BASE_URL", DEFAULT_BASE_URL),
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  teacherEmail: readEnv("KIDSMEMO_TEACHER_EMAIL"),
  teacherPassword: readEnv("KIDSMEMO_TEACHER_PASSWORD"),
  otherTeacherEmail: readEnv("KIDSMEMO_OTHER_TEACHER_EMAIL"),
  otherTeacherPassword: readEnv("KIDSMEMO_OTHER_TEACHER_PASSWORD"),
  serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  keepRecord: readEnv("KIDSMEMO_ATTENDANCE_SMOKE_KEEP_RECORD").toLowerCase() === "true"
};

main().catch((error) => {
  console.error(`[FAIL] ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const scope = {
    organizationId: "",
    attendanceDate: futureDate(14),
    className: `QA-TEACHER-ATTENDANCE-${runId}`
  };
  const childName = `QA-TEACHER-CHILD-${runId}`;
  const note = `QA bearer attendance ${runId}`;
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const cleanupClient = config.serviceRoleKey
    ? createClient(config.supabaseUrl, config.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

  console.log(`[START] teacher attendance live smoke (${runId})`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: config.teacherEmail,
    password: config.teacherPassword
  });
  if (authError) throw new Error(`teacher login failed: ${authError.message}`);
  const accessToken = authData.session?.access_token;
  if (!accessToken) throw new Error("teacher login did not return an access token");

  let cleanupCompleted = false;
  try {
    await assertAnonymous401(`/api/attendance?attendanceDate=${scope.attendanceDate}&className=qa`);
    console.log("[PASS] anonymous attendance lookup is rejected");

    const context = await requestJson("/api/session/context", { accessToken });
    scope.organizationId = context.data?.organization?.id;
    assert(scope.organizationId, "teacher session context did not include an organization");
    console.log(`[PASS] teacher bearer resolved organization (${scope.organizationId})`);

    const saved = await requestJson("/api/attendance", {
      method: "PUT",
      accessToken,
      body: {
        ...scope,
        records: [{ childName, status: "late", note }]
      }
    });
    assert(saved.data?.saved === true, "teacher attendance PUT did not report saved=true");
    assert(saved.data?.count === 1, "teacher attendance PUT did not save one record");
    console.log("[PASS] teacher bearer saved attendance");

    const loaded = await requestJson(
      `/api/attendance?attendanceDate=${scope.attendanceDate}&className=${encodeURIComponent(scope.className)}`,
      { accessToken }
    );
    const record = loaded.data?.roster?.find((item) => item.childName === childName);
    assert(record?.status === "late", "teacher attendance GET did not return the saved status");
    assert(record?.note === note, "teacher attendance GET did not return the saved note");
    console.log("[PASS] teacher bearer read returned the saved record");

    const rlsCheck = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: rlsRows, error: rlsError } = await rlsCheck
      .from("attendance_records")
      .select("id, organization_id, attendance_date, class_name, child_name, status, note")
      .eq("organization_id", scope.organizationId)
      .eq("attendance_date", scope.attendanceDate)
      .eq("class_name", scope.className)
      .eq("child_name", childName);
    if (rlsError) throw rlsError;
    assert(rlsRows?.length === 1, "teacher bearer could not read the saved row through RLS");
    console.log("[PASS] direct Supabase teacher-token RLS read returned one row");

    if (config.otherTeacherEmail && config.otherTeacherPassword) {
      await assertOtherTeacherCannotWrite(scope, childName, accessToken);
      console.log("[PASS] other teacher cannot write outside organization scope");
    } else {
      console.log("[SKIP] other-organization denial requires KIDSMEMO_OTHER_TEACHER_EMAIL/PASSWORD");
    }

    if (!config.keepRecord) {
      if (!cleanupClient) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for cleanup; set KEEP_RECORD=true to retain QA data.");
      await cleanupClient.from("attendance_records").delete().eq("organization_id", scope.organizationId).eq("attendance_date", scope.attendanceDate).eq("class_name", scope.className).eq("child_name", childName).throwOnError();
      cleanupCompleted = true;
      console.log("[PASS] cleaned up QA attendance record");
    }

    console.log(JSON.stringify({
      ok: true,
      baseUrl: normalizeBaseUrl(config.baseUrl),
      organizationId: scope.organizationId,
      attendanceDate: scope.attendanceDate,
      className: scope.className,
      checks: ["anonymous_401", "teacher_bearer_login", "attendance_put", "attendance_get", "direct_rls_read"],
      cleanup: config.keepRecord ? "kept_by_request" : "deleted"
    }, null, 2));
  } finally {
    if (!config.keepRecord && cleanupClient && scope.organizationId && !cleanupCompleted) {
      await cleanupClient.from("attendance_records").delete().eq("organization_id", scope.organizationId).eq("attendance_date", scope.attendanceDate).eq("class_name", scope.className).eq("child_name", childName);
    }
    await supabase.auth.signOut();
  }
}

async function assertOtherTeacherCannotWrite(scope, childName, originalToken) {
  const other = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await other.auth.signInWithPassword({
    email: config.otherTeacherEmail,
    password: config.otherTeacherPassword
  });
  if (error) throw new Error(`other teacher login failed: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error("other teacher login did not return an access token");
  try {
    await requestJson("/api/attendance", {
      method: "PUT",
      accessToken: token,
      body: { ...scope, records: [{ childName, status: "present", note: "should be rejected" }] },
      expectedStatuses: [403]
    });
  } finally {
    await other.auth.signOut();
  }
}

async function assertAnonymous401(path) {
  const response = await requestJson(path, { expectedStatuses: [401] });
  assert(response.error?.code === "authentication_required", `anonymous request returned ${response.error?.code ?? "unknown error"}`);
}

async function requestJson(path, options = {}) {
  const { method = "GET", accessToken, body, expectedStatuses = [200] } = options;
  const headers = new Headers({ Accept: "application/json" });
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(new URL(path, normalizeBaseUrl(config.baseUrl)), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const payload = await response.json();
  if (!expectedStatuses.includes(response.status)) throw new Error(`${method} ${path} failed (${response.status}): ${payload?.error?.message ?? "unknown error"}`);
  if (response.ok && payload?.ok !== true) throw new Error(`${method} ${path} returned invalid success envelope`);
  if (!response.ok && payload?.ok !== false) throw new Error(`${method} ${path} returned invalid error envelope`);
  return payload;
}

function validateConfig() {
  const missing = ["supabaseUrl", "supabaseAnonKey", "teacherEmail", "teacherPassword"].filter((key) => !config[key]);
  if (missing.length) throw new Error(`missing environment variables: ${missing.join(", ")}`);
}

function readEnv(name, fallback = "") { return process.env[name]?.trim() || fallback; }
function futureDate(days) { const date = new Date(Date.now() + days * 86_400_000); return date.toISOString().slice(0, 10); }
function normalizeBaseUrl(value) { return value.endsWith("/") ? value : `${value}/`; }
function assert(condition, message) { if (!condition) throw new Error(message); }
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }
function redact(value) { return String(value).replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]"); }
