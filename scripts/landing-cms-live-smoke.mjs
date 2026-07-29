import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = 20_000;
const HERO_IMAGE = "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=82";

const config = {
  baseUrl: readEnv("KIDSMEMO_LANDING_CMS_SMOKE_BASE_URL", DEFAULT_BASE_URL),
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminEmail: readEnv("KIDSMEMO_ADMIN_EMAIL"),
  adminPassword: readEnv("KIDSMEMO_ADMIN_PASSWORD")
};

const secrets = [config.supabaseAnonKey, config.adminEmail, config.adminPassword].filter(Boolean);

main().catch((error) => {
  console.error(`[FAIL] ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const marker = `[landing-live-smoke] ${runId}`;
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.adminEmail,
    password: config.adminPassword
  });
  if (error) throw new Error(`admin login failed: ${error.message}`);

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("admin login did not return an access token");

  const adminClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const savedIds = new Map();
  let originalBySlot = new Map();
  let cleanupFailure = null;

  try {
    const operations = await requestJson("/api/admin/operations", { accessToken });
    originalBySlot = new Map(
      (operations.data?.contentBlocks ?? [])
        .filter((block) => block.scope === "landing")
        .map((block) => [block.slot, block])
    );
    const payloads = buildPayloads(originalBySlot, marker);

    for (const payload of payloads) {
      const saved = await requestJson("/api/admin/operations", {
        method: "POST",
        accessToken,
        body: { resource: "contentBlocks", payload }
      });
      assert(saved.data?.saved === true, `save failed for landing slot ${payload.slot}`);
      const id = saved.data?.item?.id;
      assert(id, `save did not return an id for landing slot ${payload.slot}`);
      savedIds.set(payload.slot, id);
    }
    console.log(`[PASS] admin bearer saved ${payloads.length} landing blocks`);

    const publicApi = await requestJson("/api/content/landing");
    assert(publicApi.data?.some((block) => block.slot === "hero" && block.title === `${marker} hero`), "public landing API did not reflect hero");
    assert(publicApi.data?.some((block) => block.slot === "landing-brand" && block.title === `${marker} brand`), "public landing API did not reflect brand");
    assert(publicApi.data?.some((block) => block.slot === "schedule" && block.title === `${marker} card`), "public landing API did not reflect card");
    console.log("[PASS] anonymous landing API reflected the published blocks");

    const html = await requestText("/");
    assert(html.includes(`${marker} hero`), "public landing HTML did not reflect hero title");
    assert(html.includes(`${marker} brand`), "public landing HTML did not reflect brand logo");
    assert(html.includes(`${marker} card`), "public landing HTML did not reflect card title");
    console.log("[PASS] anonymous landing HTML reflected the published blocks");

    console.log(JSON.stringify({
      ok: true,
      baseUrl: normalizeBaseUrl(config.baseUrl),
      checks: ["admin_bearer_save", "anonymous_landing_api_reflection", "anonymous_landing_html_reflection", "landing_restore"],
      slots: payloads.map((payload) => payload.slot),
      runId
    }, null, 2));
  } finally {
    for (const [slot, id] of savedIds) {
      try {
        const original = originalBySlot.get(slot);
        if (original) {
          await requestJson("/api/admin/operations", {
            method: "POST",
            accessToken,
            body: { resource: "contentBlocks", payload: toPayload(original) }
          });
        } else {
          const { error: deleteError } = await adminClient.from("content_blocks").delete().eq("id", id);
          if (deleteError) throw deleteError;
        }
      } catch (error) {
        cleanupFailure = cleanupFailure ?? error;
        console.error(`[CLEANUP] ${slot}: ${redact(errorMessage(error))}`);
      }
    }

    await supabase.auth.signOut();
    if (cleanupFailure) throw new Error(`landing smoke cleanup failed: ${errorMessage(cleanupFailure)}`);
  }
}

function buildPayloads(existingBySlot, marker) {
  const base = (slot, values) => ({
    ...(existingBySlot.get(slot)?.id ? { id: existingBySlot.get(slot).id } : {}),
    scope: "landing",
    organizationId: null,
    slot,
    sortOrder: existingBySlot.get(slot)?.sortOrder ?? 0,
    status: "published",
    ...values
  });

  return [
    base("hero", {
      title: `${marker} hero`,
      body: `${marker} hero body`,
      imageUrl: HERO_IMAGE,
      ctaLabel: `${marker} CTA`,
      ctaUrl: "/signup"
    }),
    base("landing-brand", {
      title: `${marker} brand`,
      body: JSON.stringify({ eyebrow: `${marker} eyebrow`, footer: `${marker} footer` }),
      imageUrl: "",
      ctaLabel: `${marker} login`,
      ctaUrl: ""
    }),
    base("landing-appearance", {
      title: "editorial",
      body: JSON.stringify({ titleSize: "standard", overlayTone: "strong" }),
      imageUrl: "",
      ctaLabel: "",
      ctaUrl: ""
    }),
    base("schedule", { title: `${marker} card`, body: `${marker} card body`, imageUrl: "", ctaLabel: "calendar", ctaUrl: "" }),
    base("teacher-message", { title: `${marker} card 2`, body: `${marker} card 2 body`, imageUrl: "", ctaLabel: "document", ctaUrl: "" }),
    base("jumbokids-benefit", { title: `${marker} card 3`, body: `${marker} card 3 body`, imageUrl: "", ctaLabel: "photo", ctaUrl: "" })
  ];
}

function toPayload(block) {
  return {
    id: block.id,
    scope: block.scope,
    organizationId: block.organizationId,
    slot: block.slot,
    title: block.title,
    body: block.body,
    imageUrl: block.imageUrl || "",
    ctaLabel: block.ctaLabel || "",
    ctaUrl: block.ctaUrl || "",
    sortOrder: block.sortOrder,
    status: block.status
  };
}

async function requestJson(path, options = {}) {
  const response = await request(path, options);
  const payload = await response.json();
  if (!response.ok || payload?.ok !== true) {
    throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${payload?.error?.message ?? "unknown error"}`);
  }
  return payload;
}

async function requestText(path) {
  const response = await request(path, { cache: "no-store" });
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status})`);
  return text;
}

async function request(path, options = {}) {
  const headers = new Headers({ Accept: "application/json" });
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  return fetch(new URL(path, normalizeBaseUrl(config.baseUrl)), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: options.cache,
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
}

function validateConfig() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: config.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: config.supabaseAnonKey,
    KIDSMEMO_ADMIN_EMAIL: config.adminEmail,
    KIDSMEMO_ADMIN_PASSWORD: config.adminPassword
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
  validateUrl(config.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  validateUrl(config.baseUrl, "KIDSMEMO_LANDING_CMS_SMOKE_BASE_URL");
}

function validateUrl(value, name) {
  const url = new URL(value);
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) {
    throw new Error(`${name} must use HTTPS (HTTP is allowed only for localhost).`);
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function readEnv(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function redact(value) {
  return secrets.reduce((result, secret) => result.split(secret).join("[REDACTED]"), value);
}
