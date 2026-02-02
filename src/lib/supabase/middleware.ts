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
    request: NextRequest,
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
                        request.cookies.set(name, value),
                    );

                    supabaseResponse = NextResponse.next({
                        request,
                    });

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );
                },
            },
            auth: {
                detectSessionInUrl: false,
                flowType: "pkce",
            },
        },
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
    // 1️⃣ ADMIN ROUTES → check admin auth
    // =========================
    if (pathname.startsWith("/admin")) {
        const adminToken = request.cookies.get("admin-auth");

        // Admin login page is public
        if (pathname === "/admin/logowanie") {
            // If already authenticated, redirect to admin panel
            if (adminToken?.value === "authenticated") {
                return NextResponse.redirect(new URL("/admin", request.url));
            }
            return supabaseResponse;
        }

        // All other admin routes require authentication
        if (adminToken?.value !== "authenticated") {
            return NextResponse.redirect(
                new URL("/admin/logowanie", request.url),
            );
        }

        return supabaseResponse;
    }

    // =========================
    // 2️⃣ PUBLIC ROUTES → always allow
    // =========================
    if (isPublicRoute(pathname)) {
        return supabaseResponse;
    }

    // =========================
    // 3️⃣ HOME → redirect logged user
    // =========================
    if (pathname === ROUTES.HOME && user) {
        return NextResponse.redirect(new URL(ROUTES.PANEL, request.url));
    }

    // =========================
    // 4️⃣ AUTH ROUTES → allow /logowanie for everyone
    // =========================
    if (pathname === ROUTES.LOGOWANIE) {
        // /logowanie is accessible by everyone (logged in or not)
        return supabaseResponse;
    }

    if (user && isAuthRoute(pathname)) {
        return NextResponse.redirect(new URL(ROUTES.PANEL, request.url));
    }

    // =========================
    // 5️⃣ PROTECTED ROUTES
    // =========================
    const isProtectedPath = ORG_REQUIRED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    if (!user && isProtectedPath) {
        const url = request.nextUrl.clone();
        url.pathname = ROUTES.LOGOWANIE;
        return NextResponse.redirect(url);
    }

    // =========================
    // 6️⃣ DEFAULT
    // =========================
    return supabaseResponse;
}
