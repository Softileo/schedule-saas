/**
 * Testy dla email/templates.ts
 *
 * Testuje:
 * - verificationEmailTemplate() - email z kodem weryfikacyjnym
 * - schedulePublishedTemplate() - email o publikacji grafiku
 * - passwordResetTemplate() - email resetu hasła
 */

import { describe, it, expect } from "vitest";
import {
    verificationEmailTemplate,
    schedulePublishedTemplate,
    passwordResetTemplate,
} from "@/lib/email/templates";

// =========================================================================
// verificationEmailTemplate
// =========================================================================
describe("verificationEmailTemplate", () => {
    it("should include verification code", () => {
        const result = verificationEmailTemplate("123456");

        expect(result).toContain("123456");
    });

    it("should include generic greeting when no name provided", () => {
        const result = verificationEmailTemplate("123456");

        expect(result).toContain("Cześć!");
    });

    it("should include personalized greeting when name provided", () => {
        const result = verificationEmailTemplate("123456", "Jan");

        expect(result).toContain("Cześć Jan!");
    });

    it("should be valid HTML document", () => {
        const result = verificationEmailTemplate("123456");

        expect(result).toContain("<!DOCTYPE html>");
        expect(result).toContain("<html>");
        expect(result).toContain("</html>");
    });

    it("should include branding", () => {
        const result = verificationEmailTemplate("123456");

        expect(result).toContain("Grafiki");
        expect(result).toContain("Weryfikacja konta");
    });

    it("should include validity information", () => {
        const result = verificationEmailTemplate("123456");

        expect(result).toContain("15 minut");
    });

    it("should include ignore message", () => {
        const result = verificationEmailTemplate("123456");

        expect(result).toContain("zignoruj");
    });

    it("should include emoji", () => {
        const result = verificationEmailTemplate("123456");

        expect(result).toContain("🗓️");
    });

    it("should handle 6-digit code", () => {
        const result = verificationEmailTemplate("987654");

        expect(result).toContain("987654");
    });

    it("should handle alphanumeric code", () => {
        const result = verificationEmailTemplate("ABC123");

        expect(result).toContain("ABC123");
    });
});

// =========================================================================
// schedulePublishedTemplate
// =========================================================================
describe("schedulePublishedTemplate", () => {
    it("should include employee name", () => {
        const result = schedulePublishedTemplate(
            "Jan Kowalski",
            "Styczeń",
            2026,
            "Firma ABC"
        );

        expect(result).toContain("Jan Kowalski");
    });

    it("should include month", () => {
        const result = schedulePublishedTemplate("Jan", "Luty", 2026, "Firma");

        expect(result).toContain("Luty");
    });

    it("should include year", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Marzec",
            2027,
            "Firma"
        );

        expect(result).toContain("2027");
    });

    it("should include organization name", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Kwiecień",
            2026,
            "Super Sklep"
        );

        expect(result).toContain("Super Sklep");
    });

    it("should be valid HTML document", () => {
        const result = schedulePublishedTemplate("Jan", "Maj", 2026, "Firma");

        expect(result).toContain("<!DOCTYPE html>");
        expect(result).toContain("<html>");
    });

    it("should include header about new schedule", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Czerwiec",
            2026,
            "Firma"
        );

        expect(result).toContain("Nowy grafik został opublikowany");
    });

    it("should include calendar emoji", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Lipiec",
            2026,
            "Firma"
        );

        expect(result).toContain("📅");
    });

    it("should include call to action", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Sierpień",
            2026,
            "Firma"
        );

        expect(result).toContain("Zobacz grafik");
    });

    it("should include login prompt", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Wrzesień",
            2026,
            "Firma"
        );

        expect(result).toContain("Zaloguj się");
    });

    it("should include link to schedule page", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Październik",
            2026,
            "Firma"
        );

        expect(result).toContain("/grafik");
    });

    it("should include success block with checkmark", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Listopad",
            2026,
            "Firma"
        );

        expect(result).toContain("✅");
    });

    it("should format month and year together", () => {
        const result = schedulePublishedTemplate(
            "Jan",
            "Grudzień",
            2026,
            "Firma"
        );

        expect(result).toContain("Grudzień 2026");
    });
});

// =========================================================================
// passwordResetTemplate
// =========================================================================
describe("passwordResetTemplate", () => {
    it("should include reset code", () => {
        const result = passwordResetTemplate("654321");

        expect(result).toContain("654321");
    });

    it("should be valid HTML document", () => {
        const result = passwordResetTemplate("123456");

        expect(result).toContain("<!DOCTYPE html>");
        expect(result).toContain("<html>");
    });

    it("should include header about password reset", () => {
        const result = passwordResetTemplate("123456");

        expect(result).toContain("Reset hasła");
    });

    it("should include lock emoji", () => {
        const result = passwordResetTemplate("123456");

        expect(result).toContain("🔐");
    });

    it("should include validity information", () => {
        const result = passwordResetTemplate("123456");

        expect(result).toContain("15 minut");
    });

    it("should include ignore message", () => {
        const result = passwordResetTemplate("123456");

        expect(result).toContain("zignoruj");
    });

    it("should include request acknowledgment", () => {
        const result = passwordResetTemplate("123456");

        expect(result).toContain("Otrzymaliśmy prośbę o reset hasła");
    });

    it("should handle different code formats", () => {
        const result = passwordResetTemplate("ABC123");

        expect(result).toContain("ABC123");
    });
});

// =========================================================================
// Common template tests
// =========================================================================
describe("common template features", () => {
    describe("all templates should have footer", () => {
        it("verification email should have footer", () => {
            const result = verificationEmailTemplate("123456");

            expect(result).toContain("Grafiki");
            expect(result).toContain("System harmonogramów pracy");
        });

        it("schedule published email should have footer", () => {
            const result = schedulePublishedTemplate(
                "Jan",
                "Styczeń",
                2026,
                "Firma"
            );

            expect(result).toContain("Grafiki");
            expect(result).toContain("System harmonogramów pracy");
        });

        it("password reset email should have footer", () => {
            const result = passwordResetTemplate("123456");

            expect(result).toContain("Grafiki");
            expect(result).toContain("System harmonogramów pracy");
        });
    });

    describe("all templates should have proper structure", () => {
        it("should have meta charset", () => {
            const templates = [
                verificationEmailTemplate("123456"),
                schedulePublishedTemplate("Jan", "Styczeń", 2026, "Firma"),
                passwordResetTemplate("123456"),
            ];

            templates.forEach((template) => {
                expect(template).toContain('charset="utf-8"');
            });
        });

        it("should have viewport meta", () => {
            const templates = [
                verificationEmailTemplate("123456"),
                schedulePublishedTemplate("Jan", "Styczeń", 2026, "Firma"),
                passwordResetTemplate("123456"),
            ];

            templates.forEach((template) => {
                expect(template).toContain("viewport");
            });
        });
    });

    describe("Polish language", () => {
        it("verification template should be in Polish", () => {
            const result = verificationEmailTemplate("123456");

            expect(result).toContain("Cześć");
            expect(result).toContain("kod weryfikacyjny");
            expect(result).toContain("minut");
        });

        it("schedule template should be in Polish", () => {
            const result = schedulePublishedTemplate(
                "Jan",
                "Styczeń",
                2026,
                "Firma"
            );

            expect(result).toContain("opublikowany");
            expect(result).toContain("harmonogram");
        });

        it("password reset template should be in Polish", () => {
            const result = passwordResetTemplate("123456");

            expect(result).toContain("hasła");
            expect(result).toContain("prośbę");
        });
    });
});
