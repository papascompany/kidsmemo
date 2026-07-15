import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const config = {
  baseUrl: process.env.KIDSMEMO_LEAVE_REQUEST_BASE_URL?.trim() || "https://kidsmemo.vercel.app",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  requesterEmail: process.env.KIDSMEMO_LEAVE_REQUESTER_EMAIL?.trim() || process.env.KIDSMEMO_OWNER_EMAIL?.trim(),
  requesterPassword: process.env.KIDSMEMO_LEAVE_REQUESTER_PASSWORD?.trim() || process.env.KIDSMEMO_OWNER_PASSWORD?.trim(),
  reviewerEmail: process.env.KIDSMEMO_ADMIN_EMAIL?.trim(),
  reviewerPassword: process.env.KIDSMEMO_ADMIN_PASSWORD?.trim()
};

main().catch((error) => {
  console.error("[FAIL] leave request live smoke", error);
  process.exitCode = 1;
});

async function main() {
  validateConfig();
  const supabase = createClient(config.supabaseUrl, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const requesterToken = await signIn(supabase, config.requesterEmail, config.requesterPassword, "requester");
  const reviewerToken = await signIn(supabase, config.reviewerEmail, config.reviewerPassword, "reviewer");
  const context = await requestJson("/api/session/context", { accessToken: requesterToken });
  const organizationId = context.data?.organization?.id;
  assert(organizationId, "requester organization was not resolved");
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const dates = [futureDate(14), futureDate(15), futureDate(16)];
  console.log(`[START] leave request live smoke (${runId})`);

  const anonymous = await requestJson(`/api/leave?organizationId=${organizationId}`, { expectedStatus: 401 });
  assert.equal(anonymous.ok, false, "anonymous leave lookup should be rejected");
  console.log("[PASS] anonymous leave lookup is rejected");

  const createdIds = [];
  try {
    const createdForCancel = await createRequest(requesterToken, organizationId, dates[0], `cancel-${runId}`);
    createdIds.push(createdForCancel.id);
    console.log("[PASS] requester created pending leave request");
    const ownBeforeCancel = await requestJson(`/api/leave?organizationId=${organizationId}`, { accessToken: requesterToken });
    assert(ownBeforeCancel.data?.requests?.some((item) => item.id === createdForCancel.id && item.status === "pending"), "own pending request was not returned");
    console.log("[PASS] requester listed own leave request");

    const cancelled = await requestJson("/api/leave", {
      accessToken: requesterToken,
      method: "PATCH",
      body: { id: createdForCancel.id, organizationId, status: "cancelled" }
    });
    assert.equal(cancelled.data?.request?.status, "cancelled");
    console.log("[PASS] requester cancelled pending leave request");

    const createdForApproval = await createRequest(requesterToken, organizationId, dates[1], `approve-${runId}`);
    createdIds.push(createdForApproval.id);
    const adminPending = await requestJson(`/api/admin/leave/requests?organizationId=${organizationId}&status=pending`, { accessToken: reviewerToken });
    assert(adminPending.data?.requests?.some((item) => item.id === createdForApproval.id), "reviewer could not list the pending request");
    console.log("[PASS] reviewer listed organization leave requests");

    const approved = await review(reviewerToken, organizationId, createdForApproval.id, "approved");
    assert.equal(approved.data?.request?.status, "approved");
    console.log("[PASS] reviewer approved pending leave request");

    const createdForRejection = await createRequest(requesterToken, organizationId, dates[2], `reject-${runId}`);
    createdIds.push(createdForRejection.id);
    const rejected = await review(reviewerToken, organizationId, createdForRejection.id, "rejected");
    assert.equal(rejected.data?.request?.status, "rejected");
    console.log("[PASS] reviewer rejected pending leave request");

    const ownAfter = await requestJson(`/api/leave?organizationId=${organizationId}`, { accessToken: requesterToken });
    const resultStatuses = new Map((ownAfter.data?.requests ?? []).filter((item) => createdIds.includes(item.id)).map((item) => [item.id, item.status]));
    assert.equal(resultStatuses.get(createdForCancel.id), "cancelled");
    assert.equal(resultStatuses.get(createdForApproval.id), "approved");
    assert.equal(resultStatuses.get(createdForRejection.id), "rejected");
    console.log("[PASS] requester read reflected all terminal statuses");

    console.log(JSON.stringify({ ok: true, organizationId, checks: ["anonymous_401", "requester_create", "requester_read", "requester_cancel", "reviewer_list", "reviewer_approve", "reviewer_reject", "terminal_statuses"] }, null, 2));
  } finally {
    const cleanup = createClient(config.supabaseUrl, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${reviewerToken}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    if (createdIds.length) {
      const result = await cleanup.from("staff_leave_requests").delete().eq("organization_id", organizationId).in("id", createdIds);
      if (result.error) throw result.error;
    }
    console.log("[PASS] cleaned up QA leave requests");
  }
}

async function createRequest(accessToken, organizationId, date, suffix) {
  const response = await requestJson("/api/leave", {
    accessToken,
    method: "POST",
    body: { organizationId, leaveType: "annual", startDate: date, endDate: date, requestedDays: 1, reason: `QA ${suffix}` }
  });
  assert.equal(response.data?.request?.status, "pending");
  return response.data.request;
}

async function review(accessToken, organizationId, id, status) {
  return requestJson("/api/admin/leave/requests", {
    accessToken,
    method: "PATCH",
    body: { id, organizationId, status }
  });
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label} login failed: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error(`${label} login did not return an access token`);
  return token;
}

async function requestJson(path, { accessToken, method = "GET", body, expectedStatus } = {}) {
  const response = await fetch(new URL(path, config.baseUrl), {
    method,
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (expectedStatus !== undefined) {
    assert.equal(response.status, expectedStatus, `${method} ${path} returned an unexpected status`);
    return payload;
  }
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validateConfig() {
  const missing = ["supabaseUrl", "anonKey", "requesterEmail", "requesterPassword", "reviewerEmail", "reviewerPassword"].filter((key) => !config[key]);
  if (missing.length) throw new Error(`missing environment variables: ${missing.join(", ")}`);
}
