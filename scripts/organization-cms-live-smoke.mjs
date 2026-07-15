import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = 20_000;
const config = {
  baseUrl: readEnv("KIDSMEMO_CMS_SMOKE_BASE_URL", DEFAULT_BASE_URL),
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminEmail: readEnv("KIDSMEMO_ADMIN_EMAIL"),
  adminPassword: readEnv("KIDSMEMO_ADMIN_PASSWORD"),
  teacherEmail: readEnv("KIDSMEMO_TEACHER_EMAIL"),
  teacherPassword: readEnv("KIDSMEMO_TEACHER_PASSWORD"),
  organizationId: readEnv("KIDSMEMO_CMS_SMOKE_ORGANIZATION_ID"),
  serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY")
};

main().catch((error) => {
  console.error(`[FAIL] ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const service = createClient(config.supabaseUrl, config.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  console.log(`[START] organization CMS live smoke (${runId})`);

  const adminToken = await signIn(supabase, config.adminEmail, config.adminPassword, "admin");
  const teacherToken = await signIn(supabase, config.teacherEmail, config.teacherPassword, "teacher");
  const teacherContext = await requestJson("/api/session/context", { accessToken: teacherToken });
  const organizationId = config.organizationId || teacherContext.data?.organization?.id;
  assert(organizationId, "CMS smoke could not resolve organization id");
  assert(teacherContext.data?.organization?.id === organizationId, "teacher is not a member of the target organization");

  const operations = await requestJson("/api/admin/operations", { accessToken: adminToken });
  const existing = operations.data?.contentBlocks?.find((item) => item.scope === "organization" && item.organizationId === organizationId && item.slot === "workspace-hero");
  const marker = `QA CMS ${runId}`;
  const payload = {
    resource: "contentBlocks",
    payload: {
      ...(existing?.id ? { id: existing.id } : {}),
      scope: "organization",
      organizationId,
      slot: "workspace-hero",
      title: marker,
      body: `운영 화면 반영 확인 ${runId}`,
      imageUrl: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=82",
      ctaLabel: "QA 확인",
      ctaUrl: "/app",
      sortOrder: existing?.sortOrder ?? 0,
      status: "published"
    }
  };
  const saved = await requestJson("/api/admin/operations", { method: "POST", accessToken: adminToken, body: payload });
  assert(saved.data?.saved === true, "admin CMS save did not report saved=true");
  console.log(`[PASS] admin saved organization CMS content (${organizationId})`);

  try {
    const reflected = await requestJson("/api/session/context", { accessToken: teacherToken });
    const block = reflected.data?.content?.blocks?.find((item) => item.slot === "workspace-hero");
    assert(block?.title === marker, "published CMS content was not returned to the operating context");
    assert(block?.body === `운영 화면 반영 확인 ${runId}`, "published CMS body was not returned to the operating context");
    console.log("[PASS] teacher operating context reflected the saved CMS content");
  } finally {
    if (existing) {
      const restore = {
        resource: "contentBlocks",
        payload: {
          id: existing.id,
          scope: existing.scope,
          organizationId: existing.organizationId,
          slot: existing.slot,
          title: existing.title,
          body: existing.body,
          imageUrl: existing.imageUrl,
          ctaLabel: existing.ctaLabel,
          ctaUrl: existing.ctaUrl,
          sortOrder: existing.sortOrder,
          status: existing.status
        }
      };
      await requestJson("/api/admin/operations", { method: "POST", accessToken: adminToken, body: restore });
      console.log("[PASS] restored original organization CMS content");
    } else {
      const insertedId = saved.data?.item?.id;
      if (!insertedId) throw new Error("created CMS content did not return an id for cleanup");
      const { error } = await service.from("content_blocks").delete().eq("id", insertedId);
      if (error) throw error;
      console.log("[PASS] deleted temporary organization CMS content");
    }
  }

  await supabase.auth.signOut();
  console.log(JSON.stringify({ ok: true, baseUrl: config.baseUrl, organizationId, checks: ["admin_bearer_save", "published_session_context_reflection", "cms_restore"] }, null, 2));
}

async function signIn(supabase, email, password, label) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label} login failed: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error(`${label} login did not return an access token`);
  return token;
}

async function requestJson(path, options = {}) {
  const { method = "GET", accessToken, body, expectedStatuses = [200] } = options;
  const headers = new Headers({ Accept: "application/json" });
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(new URL(path, normalizeBaseUrl(config.baseUrl)), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "error", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const payload = await response.json();
  if (!expectedStatuses.includes(response.status)) throw new Error(`${method} ${path} failed (${response.status}): ${payload?.error?.message ?? "unknown error"}`);
  if (response.ok && payload?.ok !== true) throw new Error(`${method} ${path} returned invalid success envelope`);
  if (!response.ok && payload?.ok !== false) throw new Error(`${method} ${path} returned invalid error envelope`);
  return payload;
}

function validateConfig() {
  const missing = ["supabaseUrl", "supabaseAnonKey", "adminEmail", "adminPassword", "teacherEmail", "teacherPassword", "serviceRoleKey"].filter((key) => !config[key]);
  if (missing.length) throw new Error(`missing environment variables: ${missing.join(", ")}`);
}
function readEnv(name, fallback = "") { return process.env[name]?.trim() || fallback; }
function normalizeBaseUrl(value) { return value.endsWith("/") ? value : `${value}/`; }
function assert(condition, message) { if (!condition) throw new Error(message); }
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }
function redact(value) { return String(value).replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]"); }
