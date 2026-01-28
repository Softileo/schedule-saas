import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import {
    getSupabaseUrl,
    getSupabaseAnonKey,
    getSupabaseServiceKey,
} from "./config";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
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
                        // Ignorujemy błędy w Server Components
                    }
                },
            },
            auth: {
                detectSessionInUrl: false,
                flowType: "pkce",
            },
        }
    );
}

// Service client bypasses RLS - use only in API routes
export async function createServiceClient() {
    return createSupabaseClient<Database>(
        getSupabaseUrl(),
        getSupabaseServiceKey(),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
