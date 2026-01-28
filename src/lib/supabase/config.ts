/**
 * Supabase Configuration
 *
 * Centralized configuration for Supabase environment variables.
 * This eliminates code duplication across client.ts, server.ts, and middleware.ts
 */

export function getSupabaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL environment variable"
        );
    }
    return url;
}

export function getSupabaseAnonKey(): string {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
        );
    }
    return key;
}

export function getSupabaseServiceKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
        throw new Error(
            "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
        );
    }
    return key;
}
