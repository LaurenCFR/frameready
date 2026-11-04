export type FrameReadyEnvironment = "development" | "preview" | "production";

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
  const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
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

  return { url, anonKey, expectedProjectRef };
}

export function getSupabaseAdminConfig() {
  return {
    ...getSupabaseConfig(),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getRequiredEnvironmentVariable(name: string): string {
  return required(name);
}
