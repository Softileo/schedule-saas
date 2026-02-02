import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/organizations
 * Pobiera listę wszystkich organizacji w systemie
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const adminAuth = cookieStore.get("admin-auth");

        // Sprawdź czy admin jest zalogowany
        if (adminAuth?.value !== "authenticated") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const supabase = await createServiceClient();

        // Pobierz wszystkie organizacje z podstawowymi informacjami
        const { data: organizations, error } = await supabase
            .from("organizations")
            .select(
                `
                id,
                name,
                slug,
                created_at,
                owner_id,
                profiles!organizations_owner_id_fkey (
                    full_name,
                    email
                )
            `,
            )
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching organizations:", error);
            return NextResponse.json(
                { error: "Failed to fetch organizations" },
                { status: 500 },
            );
        }

        // Dodaj licznik członków dla każdej organizacji
        const orgsWithStats = await Promise.all(
            (organizations || []).map(async (org) => {
                const { count: membersCount } = await supabase
                    .from("organization_members")
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", org.id);

                const { count: employeesCount } = await supabase
                    .from("employees")
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", org.id);

                return {
                    ...org,
                    membersCount: membersCount || 0,
                    employeesCount: employeesCount || 0,
                };
            }),
        );

        return NextResponse.json({ organizations: orgsWithStats });
    } catch (error) {
        console.error("Error in GET /api/admin/organizations:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
