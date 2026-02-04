import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_USE_LOCAL_SUPABASE ? process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL! : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_USE_LOCAL_SUPABASE ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseKey =
  supabaseAnonKey ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
