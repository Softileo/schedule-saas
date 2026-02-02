import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
            console.error(
                "Admin credentials not configured in environment variables",
            );
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 },
            );
        }

        // Check credentials
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            // Set secure cookie
            const cookieStore = await cookies();
            cookieStore.set({
                name: "admin-auth",
                value: "authenticated",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: "/",
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: "Invalid credentials" },
            { status: 401 },
        );
    } catch (error) {
        console.error("Admin auth error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// Logout endpoint
export async function DELETE() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete("admin-auth");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin logout error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
