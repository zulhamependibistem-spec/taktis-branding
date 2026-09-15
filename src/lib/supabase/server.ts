import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function createServerClient() {
  if (cachedClient) return cachedClient;
const url = process.env.SUPABASE_PROJECT_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}

