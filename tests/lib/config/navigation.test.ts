/**
 * Tests for navigation.ts
 * Navigation configuration and helpers
 */

import { describe, it, expect } from "vitest";
import { NAVIGATION_ITEMS, getNavHref } from "@/lib/config/navigation";

describe("navigation.ts", () => {
    describe("NAVIGATION_ITEMS", () => {
        it("should have 5 navigation items", () => {
            expect(NAVIGATION_ITEMS).toHaveLength(5);
        });

        it("should include Panel item", () => {
            const panel = NAVIGATION_ITEMS.find(
                (item) => item.name === "Panel"
            );
            expect(panel).toBeDefined();
            expect(panel?.href).toBe("/panel");
        });

        it("should include Grafik item", () => {
            const grafik = NAVIGATION_ITEMS.find(
                (item) => item.name === "Grafik"
            );
            expect(grafik).toBeDefined();
            expect(grafik?.href).toBe("/grafik");
        });

        it("should include Pracownicy item", () => {
            const pracownicy = NAVIGATION_ITEMS.find(
                (item) => item.name === "Pracownicy"
            );
            expect(pracownicy).toBeDefined();
            expect(pracownicy?.href).toBe("/pracownicy");
        });

        it("should include Zmiany item", () => {
            const zmiany = NAVIGATION_ITEMS.find(
                (item) => item.name === "Zmiany"
            );
            expect(zmiany).toBeDefined();
            expect(zmiany?.href).toBe("/zmiany");
        });

        it("should include Ustawienia item", () => {
            const ustawienia = NAVIGATION_ITEMS.find(
                (item) => item.name === "Ustawienia"
            );
            expect(ustawienia).toBeDefined();
            expect(ustawienia?.href).toBe("/ustawienia");
        });

        it("should have icons for all items", () => {
            NAVIGATION_ITEMS.forEach((item) => {
                expect(item.icon).toBeDefined();
            });
        });

        it("should have correct order", () => {
            const names = NAVIGATION_ITEMS.map((item) => item.name);
            expect(names).toEqual([
                "Panel",
                "Grafik",
                "Pracownicy",
                "Zmiany",
                "Ustawienia",
            ]);
        });
    });

    describe("getNavHref", () => {
        it("should append org param when currentOrgSlug is provided", () => {
            const result = getNavHref("/panel", "my-org", []);
            expect(result).toBe("/panel?org=my-org");
        });

        it("should use first organization slug when currentOrgSlug is null", () => {
            const orgs = [{ slug: "first-org" }, { slug: "second-org" }];
            const result = getNavHref("/grafik", null, orgs);
            expect(result).toBe("/grafik?org=first-org");
        });

        it("should return base href when no org available", () => {
            const result = getNavHref("/pracownicy", null, []);
            expect(result).toBe("/pracownicy");
        });

        it("should prefer currentOrgSlug over organizations array", () => {
            const orgs = [{ slug: "first-org" }];
            const result = getNavHref("/panel", "current-org", orgs);
            expect(result).toBe("/panel?org=current-org");
        });

        it("should work with all navigation paths", () => {
            const orgSlug = "test-org";

            expect(getNavHref("/panel", orgSlug, [])).toBe(
                "/panel?org=test-org"
            );
            expect(getNavHref("/grafik", orgSlug, [])).toBe(
                "/grafik?org=test-org"
            );
            expect(getNavHref("/pracownicy", orgSlug, [])).toBe(
                "/pracownicy?org=test-org"
            );
            expect(getNavHref("/zmiany", orgSlug, [])).toBe(
                "/zmiany?org=test-org"
            );
            expect(getNavHref("/ustawienia", orgSlug, [])).toBe(
                "/ustawienia?org=test-org"
            );
        });

        it("should handle empty string org slug", () => {
            // Empty string is falsy, so should use organizations or base href
            const orgs = [{ slug: "fallback-org" }];
            const result = getNavHref("/panel", "", orgs);
            // Empty string should be treated as no org
            expect(result).toBe("/panel?org=fallback-org");
        });

        it("should handle special characters in slug", () => {
            const result = getNavHref("/panel", "org-with-dashes", []);
            expect(result).toBe("/panel?org=org-with-dashes");
        });
    });
});
