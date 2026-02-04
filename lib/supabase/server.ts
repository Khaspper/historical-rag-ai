import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_USE_LOCAL_SUPABASE ? process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL! : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_USE_LOCAL_SUPABASE ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const key =
    supabaseAnonKey ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createServerClient(
    supabaseUrl,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore when called from Server Component (middleware refreshes sessions).
          }
        },
      },
    }
  );
}
