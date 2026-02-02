import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/switch-organization
 * Przełącza admina do wybranej organizacji (impersonation)
 */
export async function POST(request: Request) {
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

        const body = await request.json();
        const { organizationId } = body;

        if (!organizationId) {
            return NextResponse.json(
                { error: "Organization ID is required" },
                { status: 400 },
            );
        }

        const supabase = await createServiceClient();

        // Sprawdź czy organizacja istnieje
        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .select("id, name, slug")
            .eq("id", organizationId)
            .single();

        if (orgError || !organization) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 },
            );
        }

        // Zapisz w cookie że jesteśmy w trybie impersonation
        cookieStore.set("admin-impersonation", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 hours
        });

        // Zapisz ID organizacji do cookie
        cookieStore.set("admin-impersonation-org", organizationId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 hours
        });

        // Ustaw current_organization dla dashboardu
        cookieStore.set("current_organization", organizationId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return NextResponse.json({
            success: true,
            organization,
            redirectUrl: `/panel?org=${organization.slug}`,
        });
    } catch (error) {
        console.error("Error in POST /api/admin/switch-organization:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
