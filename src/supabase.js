import { createClient } from "@supabase/supabase-js";

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const rawSupabaseUrl = env.VITE_SUPABASE_URL ?? "";
const rawSupabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? "";
const supabaseUrl = rawSupabaseUrl.trim().replace(/\/+$/g, "");
const supabaseAnonKey = rawSupabaseAnonKey.trim();

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes("your-project.supabase.co") &&
  !supabaseAnonKey.includes("your-anon-key") &&
  /^https?:\/\//.test(supabaseUrl);

if (!isSupabaseConfigured) {
  console.error(
    "Supabase configuration is missing or invalid. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file and restart the dev server."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const SUPABASE_TOKEN_KEYS = ["supabase.auth.token", "sb:auth.token"];

const parseSupabaseStoredUser = () => {
  if (typeof window === "undefined") return null;

  for (const key of SUPABASE_TOKEN_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const user = parsed?.currentSession?.user || parsed?.user || parsed?.currentUser;
      if (user) return user;
    } catch (error) {
      console.debug("Unable to parse Supabase auth token from localStorage:", error);
    }
  }

  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured || !supabase) {
    const local = localStorage.getItem("tm.local_user");
    return local
      ? JSON.parse(local)
      : {
          id: "local-user",
          email: "local@example.com",
          user_metadata: { display_name: "Local User" },
        };
  }

  const getUserFromSupabase = async () => {
    const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
    if (session?.user) return session.user;
    if (sessionError) console.debug("Supabase auth.getSession error:", sessionError);

    const { data: { user } = {}, error: userError } = await supabase.auth.getUser();
    if (user) return user;
    if (userError) console.debug("Supabase auth.getUser error:", userError);

    return null;
  };

  try {
    let user = await getUserFromSupabase();
    if (!user) {
      for (let attempt = 0; attempt < 2 && !user; attempt += 1) {
        await sleep(150);
        user = await getUserFromSupabase();
      }
    }

    if (user) return user;

    // Do not trust stale auth tokens from localStorage when Supabase is configured.
    // A stale user can mismatch auth.uid() and cause RLS insert/update failures.
    return null;
  } catch (err) {
    console.error("Error while getting current Supabase user:", err);
  }

  return null;
};
