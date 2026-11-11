export type FrameReadyEnvironment = "development" | "preview" | "production";

export function assertSupabasePublishableKey(key: string): void {
  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must contain a Supabase publishable key, never a secret key."
    );
  }
}

export function assertSupabaseSecretKey(key: string): void {
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must contain a Supabase secret key, never a publishable key."
    );
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getFrameReadyEnvironment(): FrameReadyEnvironment {
  const value = required("FRAMEREADY_ENVIRONMENT");

  if (value !== "development" && value !== "preview" && value !== "production") {
    throw new Error(
      "FRAMEREADY_ENVIRONMENT must be development, preview, or production."
    );
  }

  const vercelEnvironment = process.env.VERCEL_ENV;

  if (vercelEnvironment === "production" && value !== "production") {
    throw new Error("A Vercel Production deployment must use FRAMEREADY_ENVIRONMENT=production.");
  }

  if (vercelEnvironment === "preview" && value !== "preview") {
    throw new Error("A Vercel Preview deployment must use FRAMEREADY_ENVIRONMENT=preview.");
  }

  return value;
}

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return url.toString().replace(/\/$/, "");
}

export function getSiteUrl(): string {
  const environment = getFrameReadyEnvironment();

  if (environment === "preview") {
    return normalizeBaseUrl(required("VERCEL_BRANCH_URL"));
  }

  return normalizeBaseUrl(required("NEXT_PUBLIC_SITE_URL"));
}

export function getSupabaseConfig() {
  const environment = getFrameReadyEnvironment();

  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  assertSupabasePublishableKey(publishableKey);
  const expectedProjectRef = required("SUPABASE_PROJECT_REF");
  const productionProjectRef = required("SUPABASE_PRODUCTION_PROJECT_REF");
  const hostname = new URL(url).hostname;
  const actualProjectRef = hostname.split(".")[0];

  if (actualProjectRef !== expectedProjectRef) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL does not match SUPABASE_PROJECT_REF. Refusing to connect."
    );
  }

  if (environment === "production" && actualProjectRef !== productionProjectRef) {
    throw new Error("Production must use SUPABASE_PRODUCTION_PROJECT_REF.");
  }

  if (environment !== "production" && actualProjectRef === productionProjectRef) {
    throw new Error("Non-production cannot use the Production Supabase project.");
  }

  if (environment === "production" && !publishableKey.startsWith("sb_publishable_")) {
    throw new Error("Production must use a Supabase sb_publishable_ key.");
  }

  return { url, publishableKey, expectedProjectRef, environment };
}

export function getSupabaseAdminConfig() {
  const config = getSupabaseConfig();
  const secretKey = required("SUPABASE_SERVICE_ROLE_KEY");
  assertSupabaseSecretKey(secretKey);

  if (config.environment === "production" && !secretKey.startsWith("sb_secret_")) {
    throw new Error("Production must use a Supabase sb_secret_ key.");
  }

  return {
    ...config,
    secretKey,
  };
}

export function getRequiredEnvironmentVariable(name: string): string {
  return required(name);
}
