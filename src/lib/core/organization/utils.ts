import { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationWithRole } from "@/types";

/**
 * Gets user organizations with ownership information.
 * Used in settings page where is_owner flag is needed.
 */
export async function getUserOrganizationsWithRole(
    supabase: SupabaseClient,
    userId: string,
): Promise<OrganizationWithRole[]> {
    const { data: memberships } = await supabase
        .from("organization_members")
        .select(
            `
            organization_id,
            organizations (
                id,
                name,
                slug,
                owner_id,
                created_at
            )
        `,
        )
        .eq("user_id", userId);

    if (!memberships) return [];

    return memberships
        .filter((m) => m.organizations)
        .map((m) => {
            const org = m.organizations as unknown as {
                id: string;
                name: string;
                slug: string;
                owner_id: string;
                created_at: string;
            };
            return {
                ...org,
                is_owner: org.owner_id === userId,
            };
        });
}
