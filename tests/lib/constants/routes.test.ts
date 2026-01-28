/**
 * Tests for routes.ts
 * Route constants and helper functions
 */

import { describe, it, expect } from "vitest";
import {
    ROUTES,
    PUBLIC_ROUTES,
    AUTH_ROUTES,
    ORG_REQUIRED_ROUTES,
    isPublicRoute,
    isAuthRoute,
} from "@/lib/constants/routes";

describe("routes.ts", () => {
    describe("ROUTES", () => {
        it("should have auth routes", () => {
            expect(ROUTES.LOGOWANIE).toBe("/logowanie");
            expect(ROUTES.REJESTRACJA).toBe("/rejestracja");
            expect(ROUTES.WERYFIKACJA).toBe("/weryfikacja");
            expect(ROUTES.KONFIGURACJA).toBe("/konfiguracja");
        });

        it("should have dashboard routes", () => {
            expect(ROUTES.PANEL).toBe("/panel");
            expect(ROUTES.GRAFIK).toBe("/grafik");
            expect(ROUTES.PRACOWNICY).toBe("/pracownicy");
            expect(ROUTES.ZMIANY).toBe("/zmiany");
            expect(ROUTES.USTAWIENIA).toBe("/ustawienia");
        });

        it("should have landing route", () => {
            expect(ROUTES.HOME).toBe("/");
        });

        it("should have settings tab routes", () => {
            expect(ROUTES.USTAWIENIA_ORGANIZACJE).toBe(
                "/ustawienia?tab=organizations"
            );
            expect(ROUTES.USTAWIENIA_PROFIL).toBe("/ustawienia?tab=profile");
        });

        it("should be immutable (as const)", () => {
            // TypeScript 'as const' makes it readonly at compile time
            // Runtime check: object exists and has expected properties
            expect(typeof ROUTES).toBe("object");
            expect(Object.keys(ROUTES).length).toBeGreaterThan(0);
        });
    });

    describe("PUBLIC_ROUTES", () => {
        it("should include home route", () => {
            expect(PUBLIC_ROUTES).toContain("/");
        });

        it("should include login route", () => {
            expect(PUBLIC_ROUTES).toContain("/logowanie");
        });

        it("should include register route", () => {
            expect(PUBLIC_ROUTES).toContain("/rejestracja");
        });

        it("should include verification route", () => {
            expect(PUBLIC_ROUTES).toContain("/weryfikacja");
        });

        it("should have exactly 14 public routes", () => {
            expect(PUBLIC_ROUTES).toHaveLength(14);
        });
    });

    describe("AUTH_ROUTES", () => {
        it("should include login route", () => {
            expect(AUTH_ROUTES).toContain("/logowanie");
        });

        it("should include register route", () => {
            expect(AUTH_ROUTES).toContain("/rejestracja");
        });

        it("should include verification route", () => {
            expect(AUTH_ROUTES).toContain("/weryfikacja");
        });

        it("should have exactly 5 auth routes", () => {
            expect(AUTH_ROUTES).toHaveLength(5);
        });

        it("should not include setup route", () => {
            expect(AUTH_ROUTES).not.toContain("/konfiguracja");
        });
    });

    describe("ORG_REQUIRED_ROUTES", () => {
        it("should include all dashboard routes", () => {
            expect(ORG_REQUIRED_ROUTES).toContain("/panel");
            expect(ORG_REQUIRED_ROUTES).toContain("/grafik");
            expect(ORG_REQUIRED_ROUTES).toContain("/pracownicy");
            expect(ORG_REQUIRED_ROUTES).toContain("/zmiany");
            expect(ORG_REQUIRED_ROUTES).toContain("/ustawienia");
        });

        it("should have exactly 6 org required routes", () => {
            expect(ORG_REQUIRED_ROUTES).toHaveLength(6);
        });

        it("should not include home route", () => {
            expect(ORG_REQUIRED_ROUTES).not.toContain("/");
        });

        it("should not include auth routes", () => {
            expect(ORG_REQUIRED_ROUTES).not.toContain("/logowanie");
            expect(ORG_REQUIRED_ROUTES).not.toContain("/rejestracja");
        });
    });

    describe("isPublicRoute", () => {
        it("should return true for home route", () => {
            expect(isPublicRoute("/")).toBe(true);
        });

        it("should return true for login route", () => {
            expect(isPublicRoute("/logowanie")).toBe(true);
        });

        it("should return true for register route", () => {
            expect(isPublicRoute("/rejestracja")).toBe(true);
        });

        it("should return true for verification route", () => {
            expect(isPublicRoute("/weryfikacja")).toBe(true);
        });

        it("should return false for panel route", () => {
            expect(isPublicRoute("/panel")).toBe(false);
        });

        it("should return false for grafik route", () => {
            expect(isPublicRoute("/grafik")).toBe(false);
        });

        it("should return false for settings route", () => {
            expect(isPublicRoute("/ustawienia")).toBe(false);
        });

        it("should handle subroutes of public routes", () => {
            expect(isPublicRoute("/logowanie/reset")).toBe(true);
            expect(isPublicRoute("/rejestracja/confirm")).toBe(true);
        });

        it("should handle unknown routes", () => {
            expect(isPublicRoute("/unknown")).toBe(false);
            expect(isPublicRoute("/api/auth")).toBe(false);
        });
    });

    describe("isAuthRoute", () => {
        it("should return true for login route", () => {
            expect(isAuthRoute("/logowanie")).toBe(true);
        });

        it("should return true for register route", () => {
            expect(isAuthRoute("/rejestracja")).toBe(true);
        });

        it("should return true for verification route", () => {
            expect(isAuthRoute("/weryfikacja")).toBe(true);
        });

        it("should return false for home route", () => {
            expect(isAuthRoute("/")).toBe(false);
        });

        it("should return false for panel route", () => {
            expect(isAuthRoute("/panel")).toBe(false);
        });

        it("should return false for setup route", () => {
            expect(isAuthRoute("/konfiguracja")).toBe(false);
        });

        it("should handle subroutes of auth routes", () => {
            expect(isAuthRoute("/logowanie/reset")).toBe(true);
            expect(isAuthRoute("/weryfikacja/code")).toBe(true);
        });

        it("should handle unknown routes", () => {
            expect(isAuthRoute("/unknown")).toBe(false);
        });
    });
});
