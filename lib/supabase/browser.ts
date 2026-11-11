import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const expectedProjectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
  const productionProjectRef =
    process.env.NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF;
  const environment = process.env.NEXT_PUBLIC_FRAMEREADY_ENVIRONMENT;

  if (
    !url ||
    !publishableKey ||
    !expectedProjectRef ||
    !productionProjectRef ||
    !environment
  ) {
    throw new Error(
      "Missing public FrameReady or Supabase environment configuration."
    );
  }

  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must contain a Supabase publishable key, never a secret key."
    );
  }

  const actualProjectRef = new URL(url).hostname.split(".")[0];

  if (actualProjectRef !== expectedProjectRef) {
    throw new Error("Supabase URL does not match NEXT_PUBLIC_SUPABASE_PROJECT_REF.");
  }

  if (environment === "production" && actualProjectRef !== productionProjectRef) {
    throw new Error("Production browser configuration has the wrong Supabase project.");
  }

  if (environment === "production" && !publishableKey.startsWith("sb_publishable_")) {
    throw new Error("Production browser configuration must use a Supabase sb_publishable_ key.");
  }

  if (environment !== "production" && actualProjectRef === productionProjectRef) {
    throw new Error("Non-production browser configuration cannot use Production Supabase.");
  }

  browserClient = createClient(url, publishableKey);
  return browserClient;
}
