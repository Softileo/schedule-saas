/**
 * Auth Repository
 *
 * Centralized data access for authentication-related operations.
 * Handles profiles and verification codes.
 */

import { createServiceClient, createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import { type RepositoryResult, createRepositoryError } from "./types";

/**
 * Auth Repository - Server-side data access for auth operations
 */
export const authRepository = {
    /**
     * Create a user profile
     */
    async createProfile(
        userId: string,
        email: string,
        fullName?: string | null,
    ): Promise<RepositoryResult<Profile>> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("profiles")
            .insert({
                id: userId,
                email,
                full_name: fullName || email.split("@")[0],
            })
            .select()
            .single();

        return {
            data,
            error: createRepositoryError(error),
        };
    },

    /**
     * Get profile by user ID
     */
    async getProfileById(userId: string): Promise<RepositoryResult<Profile>> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        return {
            data,
            error: createRepositoryError(error),
        };
    },

    /**
     * Update profile
     */
    async updateProfile(
        userId: string,
        updates: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>,
    ): Promise<RepositoryResult<Profile>> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId)
            .select()
            .single();

        return {
            data,
            error: createRepositoryError(error),
        };
    },

    // =========================================================================
    // VERIFICATION CODES - requires service client (bypasses RLS)
    // =========================================================================

    /**
     * Create a verification code
     * Uses service client because verification_codes has restrictive RLS
     */
    async createVerificationCode(
        email: string,
        code: string,
        expiresInMinutes: number = 10,
    ): Promise<RepositoryResult<{ id: string }>> {
        const supabase = await createServiceClient();

        const expiresAt = new Date(
            Date.now() + expiresInMinutes * 60 * 1000,
        ).toISOString();

        const { data, error } = await supabase
            .from("verification_codes")
            .insert({
                email,
                code,
                expires_at: expiresAt,
            })
            .select("id")
            .single();

        return {
            data,
            error: createRepositoryError(error),
        };
    },

    /**
     * Find a valid verification code
     */
    async findValidVerificationCode(
        email: string,
        code: string,
    ): Promise<
        RepositoryResult<{
            id: string;
            email: string;
            code: string;
            expires_at: string;
        }>
    > {
        const supabase = await createServiceClient();

        const { data, error } = await supabase
            .from("verification_codes")
            .select("*")
            .eq("email", email)
            .eq("code", code)
            .gt("expires_at", new Date().toISOString())
            .single();

        return {
            data,
            error: createRepositoryError(error),
        };
    },

    /**
     * Delete verification codes for email
     */
    async deleteVerificationCodes(
        email: string,
    ): Promise<RepositoryResult<null>> {
        const supabase = await createServiceClient();

        const { error } = await supabase
            .from("verification_codes")
            .delete()
            .eq("email", email);

        return {
            data: null,
            error: createRepositoryError(error),
        };
    },

    /**
     * Delete a specific verification code by ID
     */
    async deleteVerificationCodeById(
        id: string,
    ): Promise<RepositoryResult<null>> {
        const supabase = await createServiceClient();

        const { error } = await supabase
            .from("verification_codes")
            .delete()
            .eq("id", id);

        return {
            data: null,
            error: createRepositoryError(error),
        };
    },

    /**
     * Count recent verification codes for rate limiting
     */
    async countRecentCodes(
        email: string,
        sinceMinutes: number = 15,
    ): Promise<number> {
        const supabase = await createServiceClient();

        const since = new Date(
            Date.now() - sinceMinutes * 60 * 1000,
        ).toISOString();

        const { count } = await supabase
            .from("verification_codes")
            .select("id", { count: "exact", head: true })
            .eq("email", email)
            .gte("created_at", since);

        return count || 0;
    },
};
