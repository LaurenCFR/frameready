import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/environment";

export function createSupabaseServerClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseConfig();

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
