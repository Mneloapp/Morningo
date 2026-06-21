import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";

export function createClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase environment variables are missing or invalid.");
  }

  return createBrowserClient(config.url, config.anonKey);
}
