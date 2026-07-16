const DEFAULT_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = 20_000;

const baseUrl = normalizeBaseUrl(readEnv("KIDSMEMO_GUARD_SMOKE_BASE_URL", DEFAULT_BASE_URL));

main().catch((error) => {
  console.error(`[FAIL] ${errorMessage(error)}`);
  process.exitCode = 1;
});

async function main() {
  validateUrl(baseUrl);
  const checks = [];

  await assertHtml("/login");
  checks.push("login_route_200");
  await assertHtml("/signup");
  checks.push("signup_route_200");

  await assertUnauthorized("GET", "/api/events");
  checks.push("events_get_401");
  await assertUnauthorized("GET", "/api/admin/organizations?limit=1");
  checks.push("admin_organizations_get_401");
  await assertUnauthorized("POST", "/api/events", {
    organizationId: "00000000-0000-0000-0000-000000000000",
    title: "guard smoke",
    eventDate: "2026-10-15",
    audience: "all",
    classNames: [],
    description: "",
    supplies: []
  });
  checks.push("events_post_401");
  await assertUnauthorized("POST", "/api/events/import-year-plan", {
    organizationId: "00000000-0000-0000-0000-000000000000",
    year: 2026,
    events: [
      {
        title: "guard smoke",
        eventDate: "2026-10-15",
        audience: "all"
      }
    ]
  });
  checks.push("year_plan_import_post_401");
  await assertUnauthorized("POST", "/api/onboarding", {
    action: "create",
    profileName: "guard smoke",
    organizationName: "guard smoke",
    organizationType: "daycare",
    organizationRegion: "서울"
  });
  checks.push("onboarding_post_401");
  await assertUnauthorized("POST", "/api/admin/operations", { resource: "pushCampaigns", payload: {} });
  checks.push("admin_operations_post_401");
  await assertUnauthorized("POST", "/api/jobs/send-reminders", {});
  checks.push("reminder_job_post_401");
  await assertUnauthorized("POST", "/api/ai/event-assistant", {
    eventName: "guard smoke",
    ageGroup: "5세",
    preparationDays: 3,
    budget: "기본",
    location: "기관",
    season: "봄",
    mood: "따뜻하게"
  });
  checks.push("ai_event_assistant_post_401");
  await assertUnauthorized("POST", "/api/ai/parent-message", {
    purpose: "event_notice",
    tone: "warm",
    eventName: "guard smoke",
    senderName: "키즈메모"
  });
  checks.push("ai_parent_message_post_401");
  await assertUnauthorized("POST", "/api/webhooks/message-provider", {
    providerMessageId: "guard-smoke",
    status: "sent"
  });
  checks.push("message_webhook_post_401");
  await assertUnauthorized("POST", "/api/webhooks/jumbokids-benefits", {
    benefitId: "guard-smoke",
    status: "issued"
  });
  checks.push("jumbokids_webhook_post_401");

  console.log(JSON.stringify({ ok: true, baseUrl, checks }, null, 2));
}

async function assertHtml(path) {
  const response = await request("GET", path);
  const contentType = response.headers.get("content-type") || "";
  if (response.status !== 200 || !contentType.toLowerCase().includes("text/html")) {
    throw new Error(`${path} expected HTML 200, received ${response.status} (${contentType})`);
  }
}

async function assertUnauthorized(method, path, body) {
  const response = await request(method, path, body);
  const payload = await parseJson(response, path);
  if (response.status !== 401 || payload?.ok !== false || payload?.error?.code !== "authentication_required") {
    throw new Error(`${method} ${path} expected authentication_required 401, received ${response.status}`);
  }
}

async function request(method, path, body) {
  return fetch(new URL(path, `${baseUrl}/`), {
    method,
    headers: {
      Accept: "application/json, text/html",
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
}

async function parseJson(response, path) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${path} returned non-JSON content (${response.status})`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${path} returned invalid JSON (${response.status})`);
  }
}

function validateUrl(value) {
  const url = new URL(value);
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) {
    throw new Error("KIDSMEMO_GUARD_SMOKE_BASE_URL must use HTTPS (HTTP is allowed only for localhost).");
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function readEnv(key, fallback) {
  return process.env[key]?.trim() || fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
