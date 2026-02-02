import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/exit-impersonation
 * Wychodzi z trybu impersonation i wraca do panelu admina
 */
export async function POST() {
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

        // Usuń cookie impersonation
        cookieStore.delete("admin-impersonation");
        cookieStore.delete("admin-impersonation-org");
        cookieStore.delete("current_organization");

        return NextResponse.json({
            success: true,
            redirectUrl: "/admin",
        });
    } catch (error) {
        console.error("Error in POST /api/admin/exit-impersonation:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
