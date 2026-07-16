import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://kidsmemo.vercel.app";
const REQUEST_TIMEOUT_MS = 20_000;

const config = {
  baseUrl: readEnv("KIDSMEMO_ONBOARDING_SMOKE_BASE_URL", DEFAULT_BASE_URL),
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  ownerEmail: readEnv("KIDSMEMO_ONBOARDING_OWNER_EMAIL", "kidsmemo.onboarding.owner@storige.co.kr"),
  ownerPassword: readEnv("KIDSMEMO_ONBOARDING_OWNER_PASSWORD", "KidsmemoOwner!2026"),
  joinerEmail: readEnv("KIDSMEMO_ONBOARDING_JOINER_EMAIL", "kidsmemo.onboarding.joiner@storige.co.kr"),
  joinerPassword: readEnv("KIDSMEMO_ONBOARDING_JOINER_PASSWORD", "KidsmemoJoiner!2026"),
  keepRecord: readEnv("KIDSMEMO_ONBOARDING_SMOKE_KEEP_RECORD").toLowerCase() === "true"
};

const secrets = [
  config.supabaseAnonKey,
  config.serviceRoleKey,
  config.ownerEmail,
  config.ownerPassword,
  config.joinerEmail,
  config.joinerPassword
].filter(Boolean);

main().catch((error) => {
  console.error(`[FAIL] ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();

  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const qaPrefix = `QA-ONBOARDING-INVITE-${runId}`;
  const service = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`[START] onboarding invite live smoke (${runId})`);

  const [ownerAccount, joinerAccount] = await Promise.all([
    ensureUser(service, {
      email: config.ownerEmail,
      password: config.ownerPassword,
      name: "초대 스모크 원장"
    }),
    ensureUser(service, {
      email: config.joinerEmail,
      password: config.joinerPassword,
      name: "초대 스모크 교사"
    })
  ]);
  console.log("[PASS] ensured owner and joiner auth users");

  const [ownerSession, joinerSession] = await Promise.all([
    signIn(config.ownerEmail, config.ownerPassword),
    signIn(config.joinerEmail, config.joinerPassword)
  ]);
  console.log("[PASS] signed in owner and joiner users");

  let organizationId = null;
  let inviteId = null;
  let cleanupCompleted = false;

  try {
    const created = await requestJson("/api/onboarding", {
      method: "POST",
      accessToken: ownerSession.accessToken,
      body: {
        action: "create",
        profileName: "초대 스모크 원장",
        profilePhone: "",
        organizationName: `${qaPrefix} 어린이집`,
        organizationType: "daycare",
        organizationRegion: "서울 QA"
      },
      expectedStatuses: [201]
    });
    organizationId = created.data?.organizationId;
    assert(organizationId, "create onboarding did not return organizationId");
    assert(created.data?.role === "owner", "created owner membership did not return owner role");
    console.log("[PASS] owner created a QA organization through onboarding API");

    const invite = await requestJson("/api/onboarding", {
      method: "POST",
      accessToken: ownerSession.accessToken,
      body: {
        action: "createInvite",
        organizationId,
        role: "teacher",
        maxUses: 1
      },
      expectedStatuses: [201]
    });
    inviteId = invite.data?.id;
    const inviteCode = invite.data?.code;
    assert(inviteId, "createInvite did not return invite id");
    assert(inviteCode, "createInvite did not return invite code");
    console.log("[PASS] owner created a one-use teacher invite code");

    const joined = await requestJson("/api/onboarding", {
      method: "POST",
      accessToken: joinerSession.accessToken,
      body: {
        action: "join",
        profileName: "초대 스모크 교사",
        profilePhone: "",
        inviteCode
      },
      expectedStatuses: [201]
    });
    assert(joined.data?.organizationId === organizationId, "joiner organization did not match invite organization");
    assert(joined.data?.role === "teacher", "joiner role did not match invite role");
    console.log("[PASS] joiner used the invite code and received teacher membership");

    const joinerStatus = await requestJson("/api/onboarding", {
      accessToken: joinerSession.accessToken
    });
    assert(
      joinerStatus.data?.memberships?.some((membership) => membership.organizationId === organizationId),
      "joiner onboarding status did not include the QA organization"
    );
    console.log("[PASS] joiner onboarding status includes the invited organization");

    if (!config.keepRecord) {
      await cleanupQaRecords(service, {
        organizationId,
        createdAuthUserIds: [ownerAccount, joinerAccount]
          .filter((account) => account.created)
          .map((account) => account.user.id)
      });
      cleanupCompleted = true;
      console.log("[PASS] cleaned up QA organization, memberships, and invites");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl: normalizeBaseUrl(config.baseUrl),
          checks: [
            "ensure_auth_users",
            "owner_onboarding_create",
            "owner_create_invite",
            "joiner_invite_join",
            "joiner_status_membership"
          ],
          organizationId,
          cleanup: config.keepRecord ? "kept_by_request" : "deleted"
        },
        null,
        2
      )
    );
  } finally {
    if (!config.keepRecord && organizationId && !cleanupCompleted) {
      try {
        await cleanupQaRecords(service, {
          organizationId,
          createdAuthUserIds: [ownerAccount, joinerAccount]
            .filter((account) => account.created)
            .map((account) => account.user.id)
        });
      } catch (error) {
        console.error(`[WARN] cleanup may be incomplete: ${redact(errorMessage(error))}`);
      }
    }
  }
}

async function ensureUser(supabase, user) {
  const existing = await findUserByEmail(supabase, user.email);
  if (existing) {
    return {
      user: existing,
      created: false
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      name: user.name
    }
  });

  if (error) throw error;
  return {
    user: data.user,
    created: true
  };
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  throw new Error("Could not find user within the first 5000 auth users.");
}

async function signIn(email, password) {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login failed: ${error.message}`);
  assert(data.session?.access_token, "login did not return an access token");
  return {
    accessToken: data.session.access_token
  };
}

async function requestJson(path, options = {}) {
  const { method = "GET", accessToken, body, expectedStatuses = [200] } = options;
  const headers = new Headers({
    Accept: "application/json"
  });

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");

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

async function cleanupQaRecords(supabase, { organizationId, createdAuthUserIds }) {
  const memberships = await supabase.from("memberships").delete().eq("organization_id", organizationId);
  if (memberships.error) throw new Error(`memberships cleanup failed: ${memberships.error.message}`);

  const invites = await supabase.from("invites").delete().eq("organization_id", organizationId);
  if (invites.error) throw new Error(`invites cleanup failed: ${invites.error.message}`);

  const organization = await supabase.from("organizations").delete().eq("id", organizationId);
  if (organization.error) throw new Error(`organization cleanup failed: ${organization.error.message}`);

  if (createdAuthUserIds.length > 0) {
    const profiles = await supabase.from("profiles").delete().in("id", createdAuthUserIds);
    if (profiles.error) throw new Error(`profiles cleanup failed: ${profiles.error.message}`);

    for (const userId of createdAuthUserIds) {
      const user = await supabase.auth.admin.deleteUser(userId);
      if (user.error) throw new Error(`auth user cleanup failed: ${user.error.message}`);
    }
  }
}

function validateConfig() {
  const missing = [];
  if (!config.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!config.supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!config.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  validateUrl(config.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  validateUrl(config.baseUrl, "KIDSMEMO_ONBOARDING_SMOKE_BASE_URL");
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
