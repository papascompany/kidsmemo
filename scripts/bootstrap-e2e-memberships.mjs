import { createClient } from "@supabase/supabase-js";

const config = {
  url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  accounts: [
    readAccountConfig("KIDSMEMO_E2E_ADMIN", {
      email: "kidsmemo.e2e.admin@storige.co.kr",
      password: "",
      profileName: "Kidsmemo E2E Admin",
      organizationName: "Kidsmemo E2E Platform",
      organizationRegion: "Platform",
      role: "admin"
    }),
    readAccountConfig("KIDSMEMO_E2E_STAFF", {
      email: "kidsmemo.e2e.staff.a@storige.co.kr",
      password: "",
      profileName: "Kidsmemo E2E Staff A",
      organizationName: "Kidsmemo E2E Organization A",
      organizationRegion: "QA-A",
      role: "teacher"
    }),
    readAccountConfig("KIDSMEMO_E2E_OTHER_STAFF", {
      email: "kidsmemo.e2e.staff.b@storige.co.kr",
      password: "",
      profileName: "Kidsmemo E2E Staff B",
      organizationName: "Kidsmemo E2E Organization B",
      organizationRegion: "QA-B",
      role: "teacher"
    })
  ]
};

main().catch((error) => {
  console.error(`Bootstrap failed: ${sanitizeErrorMessage(error)}`);
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

  const bootstrapped = [];
  for (const account of config.accounts) {
    const user = await ensureUser(supabase, account);
    await upsertProfile(supabase, account, user.id);
    const organization = await ensureOrganization(supabase, account);
    await upsertMembership(supabase, account, organization.id, user.id);
    bootstrapped.push({
      email: account.email,
      organizationId: organization.id,
      role: account.role
    });
  }

  assertDistinctStaffOrganizations(bootstrapped);

  console.log(JSON.stringify(bootstrapped, null, 2));
}

async function ensureUser(supabase, account) {
  const existing = await findUserByEmail(supabase, account.email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.profileName
      }
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      name: account.profileName
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

async function upsertProfile(supabase, account, profileId) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: profileId,
      name: account.profileName,
      email: account.email,
      phone: account.phone || null
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

async function ensureOrganization(supabase, account) {
  if (account.organizationId) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", account.organizationId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data: existing, error: findError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", account.organizationName)
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
      name: account.organizationName,
      type: account.organizationType,
      region: account.organizationRegion
    })
    .select("id, name")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertMembership(supabase, account, organizationId, profileId) {
  const { error } = await supabase.from("memberships").upsert(
    {
      organization_id: organizationId,
      profile_id: profileId,
      role: account.role
    },
    { onConflict: "organization_id,profile_id" }
  );

  if (error) {
    throw error;
  }
}

function assertDistinctStaffOrganizations(bootstrapped) {
  const staff = bootstrapped[1];
  const otherStaff = bootstrapped[2];
  if (staff.organizationId === otherStaff.organizationId) {
    throw new Error("KIDSMEMO_E2E_STAFF and KIDSMEMO_E2E_OTHER_STAFF must use different organizations.");
  }
}

function validateConfig() {
  const missing = [];
  if (!config.url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!config.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  for (const account of config.accounts) {
    if (!account.email) missing.push(`${account.prefix}_EMAIL`);
    if (!account.password) missing.push(`${account.prefix}_PASSWORD`);
    if (!account.organizationId && !account.organizationName) {
      missing.push(`${account.prefix}_ORGANIZATION_NAME`);
    }
    if (!account.organizationId && !["daycare", "kindergarten"].includes(account.organizationType)) {
      throw new Error(`${account.prefix}_ORGANIZATION_TYPE must be daycare or kindergarten.`);
    }
    if (!["owner", "manager", "teacher", "admin"].includes(account.role)) {
      throw new Error(`${account.prefix}_ROLE must be owner, manager, teacher, or admin.`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }
}

function readAccountConfig(prefix, defaults) {
  return {
    prefix,
    email: readEnv(`${prefix}_EMAIL`, defaults.email),
    password: readEnv(`${prefix}_PASSWORD`, defaults.password),
    profileName: readEnv(`${prefix}_PROFILE_NAME`, defaults.profileName),
    phone: readEnv(`${prefix}_PHONE`, ""),
    organizationId: readEnv(`${prefix}_ORGANIZATION_ID`),
    organizationName: readFirstEnv(
      [`${prefix}_ORGANIZATION_NAME`, `${prefix}_ORG_NAME`],
      defaults.organizationName
    ),
    organizationType: readFirstEnv(
      [`${prefix}_ORGANIZATION_TYPE`, `${prefix}_ORG_TYPE`],
      defaults.organizationType ?? "daycare"
    ),
    organizationRegion: readFirstEnv(
      [`${prefix}_ORGANIZATION_REGION`, `${prefix}_ORG_REGION`],
      defaults.organizationRegion
    ),
    role: readEnv(`${prefix}_ROLE`, defaults.role)
  };
}

function readFirstEnv(keys, fallback = "") {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) {
      return value;
    }
  }
  return fallback;
}

function readEnv(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function sanitizeErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "Unknown bootstrap failure";
  }

  let message = error.message;
  const secrets = [config.serviceRoleKey, ...config.accounts.map((account) => account.password)].filter(Boolean);

  for (const secret of secrets) {
    message = message.replaceAll(secret, "[REDACTED]");
  }

  return message;
}
