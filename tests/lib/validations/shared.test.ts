/**
 * Shared Validation Tests
 *
 * Testy dla wspólnych pól walidacji.
 */

import { describe, it, expect } from "vitest";
import {
    emailField,
    passwordField,
    fullNameField,
    optionalEmailField,
    verificationCodeField,
} from "@/lib/validations/shared";

describe("validations/shared", () => {
    // =========================================================================
    // emailField
    // =========================================================================
    describe("emailField", () => {
        it("should accept valid email", () => {
            expect(emailField.safeParse("test@example.com").success).toBe(true);
            expect(emailField.safeParse("user.name@domain.co.uk").success).toBe(
                true
            );
        });

        it("should reject empty string", () => {
            const result = emailField.safeParse("");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Email jest wymagany"
                );
            }
        });

        it("should reject invalid email format", () => {
            const result = emailField.safeParse("invalid-email");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Nieprawidłowy format email"
                );
            }
        });

        it("should reject email without @", () => {
            expect(emailField.safeParse("testexample.com").success).toBe(false);
        });

        it("should reject email without domain", () => {
            expect(emailField.safeParse("test@").success).toBe(false);
        });
    });

    // =========================================================================
    // passwordField
    // =========================================================================
    describe("passwordField", () => {
        it("should accept valid password", () => {
            expect(passwordField.safeParse("password123").success).toBe(true);
            expect(passwordField.safeParse("123456").success).toBe(true);
        });

        it("should reject empty password", () => {
            const result = passwordField.safeParse("");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Hasło jest wymagane"
                );
            }
        });

        it("should reject password shorter than 6 characters", () => {
            const result = passwordField.safeParse("12345");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Hasło musi mieć minimum 6 znaków"
                );
            }
        });

        it("should accept exactly 6 characters", () => {
            expect(passwordField.safeParse("123456").success).toBe(true);
        });
    });

    // =========================================================================
    // fullNameField
    // =========================================================================
    describe("fullNameField", () => {
        it("should accept valid name", () => {
            expect(fullNameField.safeParse("Jan Kowalski").success).toBe(true);
            expect(fullNameField.safeParse("Anna").success).toBe(true);
        });

        it("should reject empty string", () => {
            const result = fullNameField.safeParse("");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("Wymagane");
            }
        });

        it("should reject single character", () => {
            const result = fullNameField.safeParse("A");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("Minimum 2 znaki");
            }
        });

        it("should accept exactly 2 characters", () => {
            expect(fullNameField.safeParse("AB").success).toBe(true);
        });
    });

    // =========================================================================
    // optionalEmailField
    // =========================================================================
    describe("optionalEmailField", () => {
        it("should accept valid email", () => {
            expect(
                optionalEmailField.safeParse("test@example.com").success
            ).toBe(true);
        });

        it("should accept empty string", () => {
            expect(optionalEmailField.safeParse("").success).toBe(true);
        });

        it("should accept undefined", () => {
            expect(optionalEmailField.safeParse(undefined).success).toBe(true);
        });

        it("should reject invalid email format", () => {
            const result = optionalEmailField.safeParse("invalid");
            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // verificationCodeField
    // =========================================================================
    describe("verificationCodeField", () => {
        it("should accept 6 digit code", () => {
            expect(verificationCodeField.safeParse("123456").success).toBe(
                true
            );
            expect(verificationCodeField.safeParse("000000").success).toBe(
                true
            );
        });

        it("should reject shorter codes", () => {
            const result = verificationCodeField.safeParse("12345");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Kod musi mieć 6 cyfr"
                );
            }
        });

        it("should reject longer codes", () => {
            const result = verificationCodeField.safeParse("1234567");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Kod musi mieć 6 cyfr"
                );
            }
        });

        it("should accept alphanumeric codes (schema allows strings)", () => {
            // Schemat sprawdza tylko długość, nie czy są to cyfry
            expect(verificationCodeField.safeParse("abcdef").success).toBe(
                true
            );
        });
    });
});
