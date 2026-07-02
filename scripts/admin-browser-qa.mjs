const DEFAULT_LOCAL_BASE_URL = "http://localhost:3000";
const DEFAULT_PRODUCTION_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = Number(readEnv("KIDSMEMO_ADMIN_BROWSER_QA_TIMEOUT_MS", "20000"));

const ADMIN_TABS = [
  { id: "content", label: "콘텐츠", panelHeading: "사이트/기관 콘텐츠 관리" },
  { id: "media", label: "이미지", panelHeading: "이미지 등록/교체" },
  { id: "attendance", label: "출석", panelHeading: "출석체크 관리" },
  { id: "gifts", label: "상품권/코드", panelHeading: "교직원 쿠폰함 코드" },
  { id: "push", label: "푸시알림", panelHeading: "푸시알림/운영 메시지" },
  { id: "audit", label: "감사로그", panelHeading: "운영 감사로그" }
];

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 1000 }
];

const config = {
  target: readEnv("KIDSMEMO_ADMIN_BROWSER_QA_TARGET", "local").toLowerCase(),
  mode: readEnv("KIDSMEMO_ADMIN_BROWSER_QA_MODE", "auto").toLowerCase(),
  accessToken: readEnv("KIDSMEMO_ADMIN_BROWSER_QA_ACCESS_TOKEN")
};

const secrets = [config.accessToken].filter(Boolean);

main().catch((error) => {
  console.error(`[FAIL] ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();
  const baseUrl = normalizeBaseUrl(resolveBaseUrl());
  const checks = [];

  console.log(`[START] admin browser QA (${config.target}, ${config.mode})`);

  const adminHtml = await fetchText(new URL("/admin", baseUrl), {
    expectedStatuses: [200],
    expectedContentType: "text/html"
  });
  assertIncludes(adminHtml, "운영 관리자 콘솔", "/admin shell did not render the admin console heading");
  checks.push("admin_route_200");

  const missingTabs = ADMIN_TABS.filter((tab) => !adminHtml.includes(tab.label)).map((tab) => tab.label);
  assert(missingTabs.length === 0, `/admin shell is missing tab labels: ${missingTabs.join(", ")}`);
  checks.push("admin_tab_labels_in_shell");

  assert(
    adminHtml.includes("overflow-x-auto"),
    "/admin shell is missing the intentional horizontal-scroll class for compact tab/table areas"
  );
  checks.push("admin_static_overflow_guard");

  await assertAnonymousAdminApiRejected(baseUrl);
  checks.push("anonymous_admin_api_rejected");

  if (config.accessToken) {
    await assertAdminApiShape(baseUrl, config.accessToken);
    checks.push("authorized_admin_api_shape");
  }

  const browserResult = await runBrowserChecks(baseUrl);
  checks.push(...browserResult.checks);

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        target: config.target,
        mode: browserResult.mode,
        checks,
        notes: browserResult.notes
      },
      null,
      2
    )
  );
}

async function runBrowserChecks(baseUrl) {
  if (config.mode === "dom") {
    return {
      mode: "dom",
      checks: ["dom_mode_completed"],
      notes: ["Playwright viewport checks were skipped because mode=dom."]
    };
  }

  const playwright = await loadPlaywright();
  if (!playwright) {
    if (config.mode === "playwright") {
      throw new Error("KIDSMEMO_ADMIN_BROWSER_QA_MODE=playwright requires the playwright package to be installed.");
    }
    return {
      mode: "dom",
      checks: ["dom_mode_completed"],
      notes: ["Playwright is not installed; completed lightweight HTTP/DOM checks only."]
    };
  }

  const { chromium } = playwright;
  const browser = await launchBrowserOrFallback(chromium);
  if (!browser) {
    return {
      mode: "dom",
      checks: ["dom_mode_completed"],
      notes: [
        "Playwright is installed but its browser executable is missing; completed lightweight HTTP/DOM checks only.",
        "Run `npx playwright install chromium` before release sign-off, or set KIDSMEMO_ADMIN_BROWSER_QA_MODE=playwright to fail fast."
      ]
    };
  }

  const checks = [];
  const notes = [];

  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport });
      const diagnostics = capturePageDiagnostics(page);

      if (config.accessToken) {
        await page.route("**/api/admin/**", async (route) => {
          const headers = {
            ...route.request().headers(),
            authorization: `Bearer ${config.accessToken}`
          };
          await route.continue({ headers });
        });
      }

      const operationsResponsePromise = waitForAdminOperationsResponse(page);
      await page.goto(new URL("/admin", baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: REQUEST_TIMEOUT_MS
      });
      const operationsResponse = await operationsResponsePromise;
      await page.waitForLoadState("networkidle", { timeout: REQUEST_TIMEOUT_MS }).catch(() => {});
      assertNoPageErrors(diagnostics, viewport.name);

      await assertNoPageOverflow(page, viewport.name);
      checks.push(`no_page_overflow_${viewport.name}`);

      if (config.accessToken) {
        assert(
          operationsResponse.ok(),
          `${viewport.name} authenticated /api/admin/operations returned HTTP ${operationsResponse.status()}`
        );
        await page.getByText("Admin Session").waitFor({ timeout: REQUEST_TIMEOUT_MS });
        for (const tab of ADMIN_TABS) {
          const button = page.getByRole("button", { name: tab.label, exact: true });
          await button.scrollIntoViewIfNeeded();
          await button.click({ timeout: REQUEST_TIMEOUT_MS });
          await page.getByRole("heading", { name: tab.panelHeading }).waitFor({ timeout: REQUEST_TIMEOUT_MS });
          await assertNoPageOverflow(page, `${viewport.name}_${tab.id}`);
        }
        checks.push(`admin_tabs_clickable_${viewport.name}`);
      } else {
        assert(
          operationsResponse.status() === 401,
          `${viewport.name} anonymous browser /api/admin/operations returned HTTP ${operationsResponse.status()}, expected 401`
        );
        await page.getByText("운영자 권한이 필요합니다.").waitFor({ timeout: REQUEST_TIMEOUT_MS });
        checks.push(`anonymous_admin_denied_${viewport.name}`);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (!config.accessToken) {
    notes.push("Set KIDSMEMO_ADMIN_BROWSER_QA_ACCESS_TOKEN to click authenticated admin tabs in Playwright mode.");
  }

  return { mode: "playwright", checks, notes };
}

async function launchBrowserOrFallback(chromium) {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (config.mode === "playwright") {
      throw error;
    }
    return null;
  }
}

function capturePageDiagnostics(page) {
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(errorMessage(error));
  });

  return { pageErrors };
}

function assertNoPageErrors(diagnostics, label) {
  assert(
    diagnostics.pageErrors.length === 0,
    `${label} emitted page errors: ${diagnostics.pageErrors.map(redact).join(" | ")}`
  );
}

async function waitForAdminOperationsResponse(page) {
  return page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/admin/operations" && response.request().method() === "GET";
    },
    { timeout: REQUEST_TIMEOUT_MS }
  );
}

async function assertAnonymousAdminApiRejected(baseUrl) {
  const response = await fetch(new URL("/api/admin/operations", baseUrl), {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const payload = await parseJson(response, "/api/admin/operations");

  assert(response.status === 401, `anonymous /api/admin/operations returned HTTP ${response.status}, expected 401`);
  assert(payload?.ok === false, "anonymous /api/admin/operations did not return ok=false");
  assert(
    payload?.error?.code === "authentication_required",
    `anonymous /api/admin/operations returned ${payload?.error?.code ?? "no error code"}`
  );
}

async function assertAdminApiShape(baseUrl, accessToken) {
  const response = await fetch(new URL("/api/admin/operations", baseUrl), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const payload = await parseJson(response, "/api/admin/operations");

  assert(response.ok, `authorized /api/admin/operations returned HTTP ${response.status}`);
  assert(payload?.ok === true, "authorized /api/admin/operations did not return ok=true");

  const data = payload.data;
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
  assert(missing.length === 0, `authorized admin payload is missing collections: ${missing.join(", ")}`);
}

async function assertNoPageOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      rootScrollWidth: root.scrollWidth,
      rootClientWidth: root.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth
    };
  });
  const rootOverflow = metrics.rootScrollWidth - metrics.rootClientWidth;
  const bodyOverflow = metrics.bodyScrollWidth - metrics.bodyClientWidth;
  assert(
    rootOverflow <= 2 && bodyOverflow <= 2,
    `${label} has page-level horizontal overflow: root=${rootOverflow}px body=${bodyOverflow}px`
  );
}

async function fetchText(url, { expectedStatuses, expectedContentType }) {
  const response = await fetch(url, {
    headers: { Accept: expectedContentType },
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${url.pathname} returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes(expectedContentType)) {
    throw new Error(`${url.pathname} returned ${contentType || "no content-type"}, expected ${expectedContentType}`);
  }

  return response.text();
}

async function parseJson(response, path) {
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.toLowerCase().includes("application/json"), `${path} returned non-JSON content (${response.status})`);

  try {
    return await response.json();
  } catch {
    throw new Error(`${path} returned invalid JSON (${response.status})`);
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return null;
  }
}

function resolveBaseUrl() {
  const explicit = readEnv("KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL");
  if (explicit) return explicit;

  if (config.target === "production" || config.target === "prod") {
    return readEnv("KIDSMEMO_ADMIN_BROWSER_QA_PRODUCTION_BASE_URL", DEFAULT_PRODUCTION_BASE_URL);
  }

  return readEnv("KIDSMEMO_ADMIN_BROWSER_QA_LOCAL_BASE_URL", DEFAULT_LOCAL_BASE_URL);
}

function validateConfig() {
  if (!["auto", "dom", "playwright"].includes(config.mode)) {
    throw new Error("KIDSMEMO_ADMIN_BROWSER_QA_MODE must be auto, dom, or playwright.");
  }

  validateUrl(resolveBaseUrl(), "admin browser QA base URL");
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

function readEnv(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function assertIncludes(value, expected, message) {
  assert(value.includes(expected), message);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function redact(value) {
  return secrets.reduce((result, secret) => result.split(secret).join("[REDACTED]"), value);
}
