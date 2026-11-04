import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getFrameReadyEnvironment,
  getSiteUrl,
  getSupabaseConfig,
  normalizeBaseUrl,
} from "../lib/environment.ts";

const originalEnvironment = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }

  Object.assign(process.env, originalEnvironment);
});

function setBaseEnvironment(environment: "development" | "preview" | "production") {
  process.env.FRAMEREADY_ENVIRONMENT = environment;
  if (environment === "development") {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = environment;
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://preview-ref.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_PROJECT_REF = "preview-ref";
  process.env.SUPABASE_PRODUCTION_PROJECT_REF = "production-ref";
}

test("normalizes a base URL without a doubled trailing slash", () => {
  assert.equal(normalizeBaseUrl("https://example.com/"), "https://example.com");
});

test("Preview uses the stable Vercel branch URL", () => {
  setBaseEnvironment("preview");
  process.env.VERCEL_BRANCH_URL = "frameready-git-preview-team.vercel.app";
  process.env.VERCEL_URL = "frameready-unique-hash-team.vercel.app";

  assert.equal(
    getSiteUrl(),
    "https://frameready-git-preview-team.vercel.app"
  );
});

test("Preview fails closed without a stable branch URL", () => {
  setBaseEnvironment("preview");
  delete process.env.VERCEL_BRANCH_URL;

  assert.throws(() => getSiteUrl(), /VERCEL_BRANCH_URL/);
});

test("Preview rejects the Production Supabase project", () => {
  setBaseEnvironment("preview");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://production-ref.supabase.co";
  process.env.SUPABASE_PROJECT_REF = "production-ref";

  assert.throws(() => getSupabaseConfig(), /cannot use the Production/);
});

test("Production rejects a non-Production Supabase project", () => {
  setBaseEnvironment("production");

  assert.throws(() => getSupabaseConfig(), /Production must use/);
});

test("Vercel environment and FrameReady environment must agree", () => {
  process.env.FRAMEREADY_ENVIRONMENT = "preview";
  process.env.VERCEL_ENV = "production";

  assert.throws(() => getFrameReadyEnvironment(), /Vercel Production/);
});
