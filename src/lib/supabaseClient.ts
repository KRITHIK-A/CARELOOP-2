import { createClient } from "@supabase/supabase-js";

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate URL format so placeholder/missing env variables don't crash createClient
const isValidUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(envUrl) ? envUrl! : "https://placeholder-project.supabase.co";

const supabaseAnonKey = envAnonKey || "dummy-anon-key";

export const isSupabaseConfigured = Boolean(
  isValidUrl(envUrl) && envAnonKey && envAnonKey !== "dummy-anon-key",
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseConfig = {
  url: envUrl,
  anonKey: envAnonKey,
};

export default supabase;
