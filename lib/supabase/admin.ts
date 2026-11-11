import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "@/lib/environment";

export function createSupabaseAdminClient(): SupabaseClient {
  const { url, secretKey } = getSupabaseAdminConfig();

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
