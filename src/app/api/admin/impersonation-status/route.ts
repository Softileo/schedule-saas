import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/impersonation-status
 * Sprawdza czy admin jest w trybie impersonation i zwraca informacje o organizacji
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const adminAuth = cookieStore.get("admin-auth");

        // Sprawdź czy admin jest zalogowany
        if (adminAuth?.value !== "authenticated") {
            return NextResponse.json({
                isImpersonating: false,
            });
        }

        const isImpersonating =
            cookieStore.get("admin-impersonation")?.value === "true";
        const orgId = cookieStore.get("admin-impersonation-org")?.value;

        if (!isImpersonating || !orgId) {
            return NextResponse.json({
                isImpersonating: false,
            });
        }

        const supabase = await createServiceClient();

        // Pobierz informacje o organizacji
        const { data: organization, error } = await supabase
            .from("organizations")
            .select(
                `
                id,
                name,
                slug,
                owner_id,
                profiles!organizations_owner_id_fkey (
                    full_name,
                    email
                )
            `,
            )
            .eq("id", orgId)
            .single();

        if (error || !organization) {
            return NextResponse.json({
                isImpersonating: false,
            });
        }

        return NextResponse.json({
            isImpersonating: true,
            organization,
        });
    } catch (error) {
        console.error("Error in GET /api/admin/impersonation-status:", error);
        return NextResponse.json({
            isImpersonating: false,
        });
    }
}
