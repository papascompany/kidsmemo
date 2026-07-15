import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const config = {
  baseUrl: process.env.KIDSMEMO_LEAVE_SMOKE_BASE_URL?.trim() || "https://kidsmemo.vercel.app",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  adminEmail: process.env.KIDSMEMO_ADMIN_EMAIL?.trim(),
  adminPassword: process.env.KIDSMEMO_ADMIN_PASSWORD?.trim(),
  ownerEmail: process.env.KIDSMEMO_OWNER_EMAIL?.trim(),
  ownerPassword: process.env.KIDSMEMO_OWNER_PASSWORD?.trim()
};

main().catch((error) => {
  console.error("[FAIL] annual leave live smoke", error);
  process.exitCode = 1;
});

async function main() {
  validateConfig();
  const supabase = createClient(config.supabaseUrl, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const adminToken = await signIn(supabase, config.adminEmail, config.adminPassword, "admin");
  const ownerToken = await signIn(supabase, config.ownerEmail, config.ownerPassword, "owner");
  const ownerUser = await supabase.auth.getUser(ownerToken);
  if (ownerUser.error || !ownerUser.data.user) throw ownerUser.error ?? new Error("owner user was not returned");
  const context = await requestJson("/api/session/context", { accessToken: ownerToken });
  const organizationId = context.data?.organization?.id;
  assert(organizationId, "owner organization was not resolved");
  const profileId = ownerUser.data.user.id;
  const before = await requestJson(`/api/admin/leave?organizationId=${organizationId}`, { accessToken: adminToken });
  const previousSettings = before.data?.settings?.[0] ?? null;
  const previousEmployment = (before.data?.staff ?? []).find((item) => item.profileId === profileId) ?? null;
  console.log(`[START] annual leave live smoke (${organizationId})`);

  try {
    const settings = await requestJson("/api/admin/leave", {
      accessToken: adminToken,
      method: "POST",
      body: {
        resource: "settings",
        organizationId,
        headcount: 5,
        calculationBasis: "hire_date",
        effectiveFrom: "2026-01-01"
      }
    });
    assert(settings.data?.saved === true, "leave settings were not saved");
    console.log("[PASS] admin bearer saved organization leave settings");

    const employment = await requestJson("/api/admin/leave", {
      accessToken: adminToken,
      method: "POST",
      body: {
        resource: "employment",
        organizationId,
        profileId,
        hireDate: "2024-01-10",
        terminationDate: null,
        weeklyHours: 40,
        annualAttendanceRate: 1,
        employmentType: "regular",
        monthlyAttendance: {}
      }
    });
    assert(employment.data?.saved === true, "employment record was not saved");
    console.log("[PASS] admin bearer saved staff employment record");

    const after = await requestJson(`/api/admin/leave?organizationId=${organizationId}&asOfDate=2026-07-15`, { accessToken: adminToken });
    const staff = after.data?.staff?.find((item) => item.profileId === profileId);
    assert.equal(staff?.summary?.accruedDays, 30, "annual leave summary should include two 15-day grants");
    assert.equal(staff?.summary?.remainingDays, 30, "unused annual leave should remain available");
    assert.equal(staff?.summary?.needsAttendanceInput, false, "complete attendance input should not warn");
    console.log("[PASS] admin bearer read returned statutory annual leave summary");
  } finally {
    const cleanup = createClient(config.supabaseUrl, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${adminToken}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    await cleanup.from("staff_employment_records").delete().eq("organization_id", organizationId).eq("profile_id", profileId);
    if (previousEmployment) {
      await requestJson("/api/admin/leave", {
        accessToken: adminToken,
        method: "POST",
        body: {
          resource: "employment",
          ...previousEmployment,
          organizationId,
          profileId,
          annualAttendanceRate: previousEmployment.annualAttendanceRate,
          monthlyAttendance: previousEmployment.monthlyAttendance ?? {}
        }
      });
    }
    if (previousSettings) {
      await requestJson("/api/admin/leave", {
        accessToken: adminToken,
        method: "POST",
        body: { resource: "settings", ...previousSettings }
      });
    } else {
      await cleanup.from("organization_leave_settings").delete().eq("organization_id", organizationId);
    }
    console.log("[PASS] cleaned up QA leave settings and employment record");
  }
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label} login failed: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error(`${label} login did not return an access token`);
  return token;
}

async function requestJson(path, { accessToken, method = "GET", body } = {}) {
  const response = await fetch(new URL(path, config.baseUrl), {
    method,
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

function validateConfig() {
  const missing = ["supabaseUrl", "anonKey", "adminEmail", "adminPassword", "ownerEmail", "ownerPassword"].filter((key) => !config[key]);
  if (missing.length) throw new Error(`missing environment variables: ${missing.join(", ")}`);
}
