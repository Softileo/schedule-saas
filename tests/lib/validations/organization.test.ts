/**
 * Testy dla validations/organization.ts
 * Walidacja organizacji i generowanie slug
 */

import { describe, it, expect } from "vitest";
import {
    organizationSchema,
    organizationUpdateSchema,
    generateSlug,
} from "@/lib/validations/organization";

// ============================================================================
// organizationSchema
// ============================================================================

describe("organizationSchema", () => {
    describe("poprawne dane", () => {
        it("akceptuje poprawną nazwę organizacji", () => {
            const result = organizationSchema.safeParse({ name: "Moja Firma" });

            expect(result.success).toBe(true);
        });

        it("akceptuje nazwę z 2 znakami (minimum)", () => {
            const result = organizationSchema.safeParse({ name: "AB" });

            expect(result.success).toBe(true);
        });

        it("akceptuje nazwę z 100 znakami (maksimum)", () => {
            const result = organizationSchema.safeParse({
                name: "A".repeat(100),
            });

            expect(result.success).toBe(true);
        });

        it("akceptuje nazwę z polskimi znakami", () => {
            const result = organizationSchema.safeParse({
                name: "Żółta Firma Świętokrzyska",
            });

            expect(result.success).toBe(true);
        });

        it("akceptuje nazwę z cyframi i znakami specjalnymi", () => {
            const result = organizationSchema.safeParse({
                name: "Firma 2024 - Oddział #1",
            });

            expect(result.success).toBe(true);
        });
    });

    describe("błędne dane", () => {
        it("odrzuca pustą nazwę", () => {
            const result = organizationSchema.safeParse({ name: "" });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain("wymagana");
            }
        });

        it("odrzuca nazwę z 1 znakiem", () => {
            const result = organizationSchema.safeParse({ name: "A" });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain("2 znaki");
            }
        });

        it("odrzuca nazwę dłuższą niż 100 znaków", () => {
            const result = organizationSchema.safeParse({
                name: "A".repeat(101),
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain("100");
            }
        });

        it("odrzuca brakującą nazwę", () => {
            const result = organizationSchema.safeParse({});

            expect(result.success).toBe(false);
        });

        it("odrzuca null jako nazwę", () => {
            const result = organizationSchema.safeParse({ name: null });

            expect(result.success).toBe(false);
        });

        it("odrzuca liczbę jako nazwę", () => {
            const result = organizationSchema.safeParse({ name: 12345 });

            expect(result.success).toBe(false);
        });
    });
});

// ============================================================================
// organizationUpdateSchema
// ============================================================================

describe("organizationUpdateSchema", () => {
    it("akceptuje częściową aktualizację z nazwą", () => {
        const result = organizationUpdateSchema.safeParse({
            name: "Nowa Nazwa",
        });

        expect(result.success).toBe(true);
    });

    it("akceptuje pusty obiekt (wszystkie pola opcjonalne)", () => {
        const result = organizationUpdateSchema.safeParse({});

        expect(result.success).toBe(true);
    });

    it("waliduje nazwę gdy jest podana", () => {
        const result = organizationUpdateSchema.safeParse({ name: "A" });

        expect(result.success).toBe(false);
    });
});

// ============================================================================
// generateSlug
// ============================================================================

describe("generateSlug", () => {
    describe("podstawowe konwersje", () => {
        it("konwertuje na małe litery", () => {
            expect(generateSlug("WIELKIE LITERY")).toBe("wielkie-litery");
        });

        it("zamienia spacje na myślniki", () => {
            expect(generateSlug("Moja Firma")).toBe("moja-firma");
        });

        it("usuwa wielokrotne spacje", () => {
            expect(generateSlug("Moja   Firma")).toBe("moja-firma");
        });
    });

    describe("polskie znaki", () => {
        it("usuwa polskie znaki diakrytyczne (z akcntami)", () => {
            // NFD normalizuje ó na o+akccent, ale nie ł
            // "Żółta" -> "Zo" (ż=z+akcent, ó=o+akcent), ale ł jest usuwane
            expect(generateSlug("Żółta Firma")).toBe("zo-ta-firma");
        });

        it("obsługuje większość polskich znaków (ł nie jest normalizowane przez NFD)", () => {
            // ł i Ł nie mają dekompozycji w Unicode NFD, więc są usuwane jako non-alphanumeric
            expect(generateSlug("ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ")).toBe(
                "ace-noszz-ace-noszz"
            );
        });

        it("konwertuje ó na o", () => {
            expect(generateSlug("Górski")).toBe("gorski");
        });

        it("ł jest usuwane (brak dekompozycji NFD)", () => {
            // ł nie ma dekompozycji NFD, jest traktowane jako specjalny znak i usuwane
            expect(generateSlug("Łódź")).toBe("odz");
        });
    });

    describe("znaki specjalne", () => {
        it("usuwa znaki specjalne", () => {
            expect(generateSlug("Firma! @#$%")).toBe("firma");
        });

        it("zamienia znaki specjalne na myślniki", () => {
            expect(generateSlug("Firma & Syn")).toBe("firma-syn");
        });

        it("usuwa wielokrotne myślniki", () => {
            expect(generateSlug("Firma---Test")).toBe("firma-test");
        });

        it("usuwa myślniki z początku i końca", () => {
            expect(generateSlug("-Firma-")).toBe("firma");
        });

        it("usuwa myślniki z początku", () => {
            expect(generateSlug("--Firma")).toBe("firma");
        });

        it("usuwa myślniki z końca", () => {
            expect(generateSlug("Firma--")).toBe("firma");
        });
    });

    describe("limity długości", () => {
        it("obcina slug do 50 znaków", () => {
            const longName = "A".repeat(100);
            const slug = generateSlug(longName);

            expect(slug.length).toBe(50);
        });

        it("obcina po usunięciu znaków specjalnych", () => {
            const longName =
                "Bardzo Długa Nazwa Organizacji Która Ma Ponad Pięćdziesiąt Znaków";
            const slug = generateSlug(longName);

            expect(slug.length).toBeLessThanOrEqual(50);
        });
    });

    describe("cyfry", () => {
        it("zachowuje cyfry", () => {
            expect(generateSlug("Firma 2024")).toBe("firma-2024");
        });

        it("obsługuje same cyfry", () => {
            expect(generateSlug("123456")).toBe("123456");
        });

        it("obsługuje mieszankę cyfr i liter", () => {
            expect(generateSlug("ABC123def")).toBe("abc123def");
        });
    });

    describe("edge cases", () => {
        it("obsługuje pusty string", () => {
            expect(generateSlug("")).toBe("");
        });

        it("obsługuje same znaki specjalne", () => {
            expect(generateSlug("!@#$%^&*()")).toBe("");
        });

        it("obsługuje same spacje", () => {
            expect(generateSlug("     ")).toBe("");
        });

        it("obsługuje emoji", () => {
            const slug = generateSlug("Firma 🚀 Test");
            // Emoji powinno być usunięte
            expect(slug).not.toContain("🚀");
        });
    });

    describe("rzeczywiste przypadki", () => {
        it("Lidl Polska", () => {
            expect(generateSlug("Lidl Polska")).toBe("lidl-polska");
        });

        it("Żabka - sklep nr 123", () => {
            expect(generateSlug("Żabka - sklep nr 123")).toBe(
                "zabka-sklep-nr-123"
            );
        });

        it("McDonald's Restaurant", () => {
            expect(generateSlug("McDonald's Restaurant")).toBe(
                "mcdonald-s-restaurant"
            );
        });

        it("H&M Store", () => {
            expect(generateSlug("H&M Store")).toBe("h-m-store");
        });

        it("Café Różana", () => {
            expect(generateSlug("Café Różana")).toBe("cafe-rozana");
        });
    });
});
