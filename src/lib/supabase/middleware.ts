import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseUrl, getSupabaseAnonKey } from "./config";
import {
    ROUTES,
    ORG_REQUIRED_ROUTES,
    isPublicRoute,
    isAuthRoute,
} from "@/lib/constants/routes";

export async function updateSession(
    request: NextRequest
): Promise<NextResponse> {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );

                    supabaseResponse = NextResponse.next({
                        request,
                    });

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
            auth: {
                detectSessionInUrl: false,
                flowType: "pkce",
            },
        }
    );

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error && !error.message?.includes("refresh")) {
        console.error("Auth error:", error);
    }

    const pathname = request.nextUrl.pathname;

    // =========================
    // 1️⃣ PUBLIC ROUTES → always allow
    // =========================
    if (isPublicRoute(pathname)) {
        return supabaseResponse;
    }

    // =========================
    // 2️⃣ HOME → redirect logged user
    // =========================
    if (pathname === ROUTES.HOME && user) {
        return NextResponse.redirect(
            new URL(ROUTES.PANEL, request.url)
        );
    }

    // =========================
    // 3️⃣ AUTH ROUTES
    // =========================
    if (user && isAuthRoute(pathname)) {
        return NextResponse.redirect(
            new URL(ROUTES.PANEL, request.url)
        );
    }

    // =========================
    // 4️⃣ PROTECTED ROUTES
    // =========================
    const isProtectedPath = ORG_REQUIRED_ROUTES.some((route) =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    if (!user && isProtectedPath) {
        const url = request.nextUrl.clone();
        url.pathname = ROUTES.LOGOWANIE;
        return NextResponse.redirect(url);
    }

    // =========================
    // 5️⃣ DEFAULT
    // =========================
    return supabaseResponse;
}
