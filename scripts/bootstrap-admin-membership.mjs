process.env.KIDSMEMO_BOOTSTRAP_ROLE = "admin";
process.env.KIDSMEMO_BOOTSTRAP_SEED_EVENT =
  process.env.KIDSMEMO_BOOTSTRAP_SEED_EVENT || "false";

await import("./bootstrap-test-membership.mjs");
