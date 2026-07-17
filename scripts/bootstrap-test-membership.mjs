import { createClient } from "@supabase/supabase-js";

const config = {
  url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  email: readEnv("KIDSMEMO_BOOTSTRAP_EMAIL", "kidsmemo.owner.test@storige.co.kr"),
  password: readEnv("KIDSMEMO_BOOTSTRAP_PASSWORD"),
  profileName: readEnv("KIDSMEMO_BOOTSTRAP_PROFILE_NAME", "키즈메모 테스트 원장"),
  phone: readEnv("KIDSMEMO_BOOTSTRAP_PHONE", ""),
  organizationName: readEnv("KIDSMEMO_BOOTSTRAP_ORG_NAME", "키즈메모 테스트 어린이집"),
  organizationType: readEnv("KIDSMEMO_BOOTSTRAP_ORG_TYPE", "daycare"),
  organizationRegion: readEnv("KIDSMEMO_BOOTSTRAP_ORG_REGION", "서울"),
  role: readEnv("KIDSMEMO_BOOTSTRAP_ROLE", "owner"),
  seedEvent: readEnv("KIDSMEMO_BOOTSTRAP_SEED_EVENT", "true") !== "false"
};

main().catch((error) => {
  console.error(`Bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const user = await ensureUser(supabase);
  await upsertProfile(supabase, user.id);
  const organization = await ensureOrganization(supabase);
  await upsertMembership(supabase, organization.id, user.id);

  let eventId = null;
  if (config.seedEvent) {
    eventId = await ensureSeedEvent(supabase, organization.id);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: config.email,
        userId: user.id,
        organizationId: organization.id,
        organizationName: organization.name,
        role: config.role,
        seedEventId: eventId,
        nextSmoke: {
          loginUrl: "https://kidsmemo.vercel.app/login",
          eventsApi: "https://kidsmemo.vercel.app/api/events"
        }
      },
      null,
      2
    )
  );
}

async function ensureUser(supabase) {
  const existing = await findUserByEmail(supabase, config.email);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: config.email,
    password: config.password,
    email_confirm: true,
    user_metadata: {
      name: config.profileName
    }
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      return user;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  throw new Error("Could not find user within the first 5000 auth users.");
}

async function upsertProfile(supabase, profileId) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: profileId,
      name: config.profileName,
      email: config.email,
      phone: config.phone || null
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

async function ensureOrganization(supabase) {
  const { data: existing, error: findError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", config.organizationName)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: config.organizationName,
      type: config.organizationType,
      region: config.organizationRegion
    })
    .select("id, name")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertMembership(supabase, organizationId, profileId) {
  const { error } = await supabase.from("memberships").upsert(
    {
      organization_id: organizationId,
      profile_id: profileId,
      role: config.role
    },
    { onConflict: "organization_id,profile_id" }
  );

  if (error) {
    throw error;
  }
}

async function ensureSeedEvent(supabase, organizationId) {
  const title = "RLS 스모크 테스트 행사";
  const { data: existing, error: findError } = await supabase
    .from("events")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("title", title)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: organizationId,
      title,
      event_date: "2026-07-01",
      audience: "전체 원아",
      class_names: ["테스트반"],
      description: "service-role bootstrap으로 생성한 RLS smoke test 행사입니다.",
      supplies: ["안내문"],
      reminder_status: "not_scheduled"
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

function validateConfig() {
  const missing = [];
  if (!config.url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!config.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!config.password) missing.push("KIDSMEMO_BOOTSTRAP_PASSWORD");

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  if (!["daycare", "kindergarten"].includes(config.organizationType)) {
    throw new Error("KIDSMEMO_BOOTSTRAP_ORG_TYPE must be daycare or kindergarten.");
  }

  if (!["owner", "manager", "teacher", "admin"].includes(config.role)) {
    throw new Error("KIDSMEMO_BOOTSTRAP_ROLE must be owner, manager, teacher, or admin.");
  }
}

function readEnv(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}
