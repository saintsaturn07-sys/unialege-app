import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// This browser client uses only the public publishable key. Never put a
// service-role key in a NEXT_PUBLIC variable or in client-side code.
export const supabase: SupabaseClient | null = url && publishableKey
  ? createClient(url, publishableKey)
  : null;
