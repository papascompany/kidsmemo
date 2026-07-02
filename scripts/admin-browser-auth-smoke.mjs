import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const config = {
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  adminEmail: readEnv("KIDSMEMO_ADMIN_EMAIL"),
  adminPassword: readEnv("KIDSMEMO_ADMIN_PASSWORD"),
  target: readEnv("KIDSMEMO_ADMIN_BROWSER_QA_TARGET", "production"),
  mode: readEnv("KIDSMEMO_ADMIN_BROWSER_QA_MODE", "playwright"),
  baseUrl: readEnv("KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL")
};

const secrets = [config.supabaseAnonKey, config.adminEmail, config.adminPassword].filter(Boolean);

main().catch((error) => {
  console.error(`[FAIL] ${redact(errorMessage(error))}`);
  process.exitCode = 1;
});

async function main() {
  validateConfig();

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.adminEmail,
    password: config.adminPassword
  });

  if (error) {
    throw new Error(`admin login failed: ${error.message}`);
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("admin login did not return an access token");
  }

  console.log(`[START] authenticated admin browser smoke (${config.target}, ${config.mode})`);

  const env = {
    ...process.env,
    KIDSMEMO_ADMIN_BROWSER_QA_ACCESS_TOKEN: accessToken,
    KIDSMEMO_ADMIN_BROWSER_QA_TARGET: config.target,
    KIDSMEMO_ADMIN_BROWSER_QA_MODE: config.mode
  };

  if (config.baseUrl) {
    env.KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL = config.baseUrl;
  }

  const exitCode = await runChild(process.execPath, ["scripts/admin-browser-qa.mjs"], env);
  await supabase.auth.signOut();

  if (exitCode !== 0) {
    throw new Error(`admin browser QA failed with exit code ${exitCode}`);
  }
}

function runChild(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
      windowsHide: true
    });

    child.on("error", reject);
    child.on("close", resolve);
  });
}

function validateConfig() {
  const missing = [];
  if (!config.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!config.supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!config.adminEmail) missing.push("KIDSMEMO_ADMIN_EMAIL");
  if (!config.adminPassword) missing.push("KIDSMEMO_ADMIN_PASSWORD");

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  validateUrl(config.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  if (config.baseUrl) {
    validateUrl(config.baseUrl, "KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL");
  }
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

function readEnv(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function redact(value) {
  return secrets.reduce((result, secret) => result.split(secret).join("[REDACTED]"), value);
}
