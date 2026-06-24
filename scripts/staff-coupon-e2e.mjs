import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const config = {
  baseUrl: readEnv("KIDSMEMO_E2E_BASE_URL", "http://127.0.0.1:3000"),
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  admin: readCredentials("KIDSMEMO_E2E_ADMIN"),
  staff: readCredentials("KIDSMEMO_E2E_STAFF"),
  otherStaff: readCredentials("KIDSMEMO_E2E_OTHER_STAFF"),
  staffOrganizationId: readEnv("KIDSMEMO_E2E_STAFF_ORGANIZATION_ID"),
  otherStaffOrganizationId: readEnv("KIDSMEMO_E2E_OTHER_STAFF_ORGANIZATION_ID")
};

main().catch((error) => {
  console.error(`[FAIL] ${sanitizeErrorMessage(error)}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();

  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const qaPrefix = `QA-STAFF-COUPON-E2E-${runId}`;
  const validUntil = futureDate(30);

  console.log(`[START] staff coupon E2E (${runId})`);

  const [adminSession, staffSession, otherStaffSession] = await Promise.all([
    signIn("admin", config.admin),
    signIn("staff", config.staff),
    signIn("other staff", config.otherStaff)
  ]);
  console.log("[PASS] logged in all E2E accounts");

  const [staffContext, otherStaffContext] = await Promise.all([
    getSessionContext(staffSession.accessToken, config.staffOrganizationId),
    getSessionContext(otherStaffSession.accessToken, config.otherStaffOrganizationId)
  ]);

  assertStaffContext("staff", staffContext);
  assertStaffContext("other staff", otherStaffContext);
  assert(
    staffContext.organization.id !== otherStaffContext.organization.id,
    "staff and other staff accounts must resolve to different organizations"
  );
  console.log("[PASS] resolved distinct staff organizations");

  const createdCoupon = await createCoupon({
    accessToken: adminSession.accessToken,
    organizationId: staffContext.organization.id,
    qaPrefix,
    validUntil
  });
  console.log(`[PASS] admin saved QA coupon (${createdCoupon.id})`);

  const staffCoupons = await listCoupons(staffSession.accessToken, staffContext.organization.id);
  const visibleCoupon = staffCoupons.find((coupon) => coupon.id === createdCoupon.id);
  assert(visibleCoupon, "created coupon was not visible to the target organization staff account");
  assert(visibleCoupon.organizationId === staffContext.organization.id, "visible coupon organization did not match");
  assert(visibleCoupon.title.startsWith("QA-STAFF-COUPON-E2E-"), "visible coupon did not have the QA prefix");
  console.log("[PASS] target organization staff can list the QA coupon");

  const download = await downloadCoupon({
    accessToken: staffSession.accessToken,
    requestOrganizationId: staffContext.organization.id,
    couponId: createdCoupon.id,
    payloadOrganizationId: staffContext.organization.id
  });
  assert(download.recorded === true, "coupon download was not recorded");
  assert(download.download?.couponId === createdCoupon.id, "download response coupon did not match");
  assert(download.download?.profileId === staffContext.director.id, "download response profile did not match");
  console.log("[PASS] target organization staff download was recorded");

  const otherCoupons = await listCoupons(otherStaffSession.accessToken, otherStaffContext.organization.id);
  assert(
    !otherCoupons.some((coupon) => coupon.id === createdCoupon.id),
    "created coupon leaked into another organization's coupon list"
  );
  console.log("[PASS] QA coupon is hidden from the other organization");

  const rejectedDownload = await requestJson(
    `/api/staff-coupons/${encodeURIComponent(createdCoupon.id)}/download`,
    {
      method: "POST",
      accessToken: otherStaffSession.accessToken,
      organizationId: otherStaffContext.organization.id,
      body: {
        organizationId: staffContext.organization.id
      },
      expectedStatuses: [403]
    }
  );
  assert(
    rejectedDownload.error?.code === "forbidden_organization",
    `cross-organization download returned unexpected error code: ${rejectedDownload.error?.code ?? "missing"}`
  );
  console.log("[PASS] cross-organization download was rejected");

  console.log(`[DONE] staff coupon E2E passed (${runId})`);
}

async function signIn(label, credentials) {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    throw new Error(`${label} login failed: ${error.message}`);
  }

  assert(data.session?.access_token, `${label} login did not return an access token`);
  return {
    accessToken: data.session.access_token
  };
}

async function getSessionContext(accessToken, organizationId) {
  const response = await requestJson("/api/session/context", {
    accessToken,
    organizationId: organizationId || undefined
  });
  return response.data;
}

async function createCoupon({ accessToken, organizationId, qaPrefix, validUntil }) {
  const response = await requestJson("/api/admin/operations", {
    method: "POST",
    accessToken,
    body: {
      resource: "staffCoupons",
      payload: {
        organizationId,
        title: `${qaPrefix} staff benefit`,
        description: "Automated organization isolation and download verification coupon.",
        code: `${qaPrefix}-CODE`,
        amountLabel: "QA 1,000 KRW",
        validUntil,
        assignedTo: "all_staff",
        status: "available",
        sites: ["jumbokids"],
        jumbokidsUrl: "https://www.jumbokids.com/",
        godomallUrl: ""
      }
    }
  });

  assert(response.data?.saved === true, "admin operations did not persist the coupon in live mode");
  assert(response.data?.resource === "staffCoupons", "admin operations returned an unexpected resource");
  assert(response.data?.item?.id, "admin operations did not return the created coupon ID");
  assert(response.data.item.organizationId === organizationId, "created coupon organization did not match");
  return response.data.item;
}

async function listCoupons(accessToken, organizationId) {
  const response = await requestJson("/api/staff-coupons", {
    accessToken,
    organizationId
  });
  assert(Array.isArray(response.data), "staff coupons response data must be an array");
  return response.data;
}

async function downloadCoupon({
  accessToken,
  requestOrganizationId,
  couponId,
  payloadOrganizationId
}) {
  const response = await requestJson(`/api/staff-coupons/${encodeURIComponent(couponId)}/download`, {
    method: "POST",
    accessToken,
    organizationId: requestOrganizationId,
    body: {
      organizationId: payloadOrganizationId
    }
  });
  return response.data;
}

async function requestJson(path, options = {}) {
  const {
    method = "GET",
    accessToken,
    organizationId,
    body,
    expectedStatuses = [200]
  } = options;
  const headers = new Headers({
    Accept: "application/json"
  });

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (organizationId) {
    headers.set("x-kidmemo-organization-id", organizationId);
  }
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(new URL(path, normalizedBaseUrl()), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
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

function assertStaffContext(label, context) {
  assert(context?.organization?.id, `${label} session context did not include an organization`);
  assert(context?.director?.id, `${label} session context did not include a profile`);
  assert(
    ["owner", "manager", "teacher"].includes(context.director.role),
    `${label} account must have an owner, manager, or teacher membership`
  );
}

function validateConfig() {
  const missing = [];
  if (!config.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!config.supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  collectMissingCredentials(missing, "KIDSMEMO_E2E_ADMIN", config.admin);
  collectMissingCredentials(missing, "KIDSMEMO_E2E_STAFF", config.staff);
  collectMissingCredentials(missing, "KIDSMEMO_E2E_OTHER_STAFF", config.otherStaff);

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  const url = normalizedBaseUrl();
  assert(["http:", "https:"].includes(url.protocol), "KIDSMEMO_E2E_BASE_URL must use http or https");
}

function collectMissingCredentials(missing, prefix, credentials) {
  if (!credentials.email) missing.push(`${prefix}_EMAIL`);
  if (!credentials.password) missing.push(`${prefix}_PASSWORD`);
}

function normalizedBaseUrl() {
  return new URL(config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`);
}

function readCredentials(prefix) {
  return {
    email: readEnv(`${prefix}_EMAIL`),
    password: readEnv(`${prefix}_PASSWORD`)
  };
}

function readEnv(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sanitizeErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "Unknown E2E failure";
  }

  let message = error.message;
  const secrets = [
    config.supabaseAnonKey,
    config.admin.password,
    config.staff.password,
    config.otherStaff.password
  ].filter(Boolean);

  for (const secret of secrets) {
    message = message.replaceAll(secret, "[REDACTED]");
  }

  return message;
}
