import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This browser client uses only the public anon key. Never put a
// service-role key in a NEXT_PUBLIC variable or in client-side code.
export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey)
  : null;
