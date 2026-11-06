// Placeholder only. Configure @supabase/supabase-js here when the backend is connected.
// Never place service-role keys or Sarvam credentials in frontend code.
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};
