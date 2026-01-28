/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - AUTH VALIDATIONS
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    loginSchema,
    registerSchema,
    verifyCodeSchema,
    resetPasswordSchema,
    newPasswordSchema,
} from "@/lib/validations/auth";

// =============================================================================
// TESTY: loginSchema
// =============================================================================

describe("loginSchema", () => {
    it("akceptuje poprawne dane", () => {
        const data = {
            email: "test@example.com",
            password: "Password123!",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca nieprawidłowy email", () => {
        const data = {
            email: "invalid-email",
            password: "Password123!",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za krótkie hasło", () => {
        const data = {
            email: "test@example.com",
            password: "short",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca puste pola", () => {
        const data = {
            email: "",
            password: "",
        };

        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// TESTY: registerSchema
// =============================================================================

describe("registerSchema", () => {
    it("akceptuje poprawne dane", () => {
        const data = {
            fullName: "Jan Kowalski",
            email: "jan@example.com",
            password: "Password123!",
            confirmPassword: "Password123!",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca gdy hasła się nie zgadzają", () => {
        const data = {
            fullName: "Jan Kowalski",
            email: "jan@example.com",
            password: "Password123!",
            confirmPassword: "DifferentPassword!",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe(
                "Hasła nie są identyczne"
            );
        }
    });

    it("odrzuca za krótkie imię", () => {
        const data = {
            fullName: "J",
            email: "jan@example.com",
            password: "Password123!",
            confirmPassword: "Password123!",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca puste imię", () => {
        const data = {
            fullName: "",
            email: "jan@example.com",
            password: "Password123!",
            confirmPassword: "Password123!",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca nieprawidłowy email", () => {
        const data = {
            fullName: "Jan Kowalski",
            email: "not-an-email",
            password: "Password123!",
            confirmPassword: "Password123!",
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// TESTY: verifyCodeSchema
// =============================================================================

describe("verifyCodeSchema", () => {
    it("akceptuje poprawny 6-cyfrowy kod", () => {
        const data = {
            email: "test@example.com",
            code: "123456",
        };

        const result = verifyCodeSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca kod z literami", () => {
        const data = {
            email: "test@example.com",
            code: "12345a",
        };

        const result = verifyCodeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za krótki kod", () => {
        const data = {
            email: "test@example.com",
            code: "12345",
        };

        const result = verifyCodeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za długi kod", () => {
        const data = {
            email: "test@example.com",
            code: "1234567",
        };

        const result = verifyCodeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca kod ze znakami specjalnymi", () => {
        const data = {
            email: "test@example.com",
            code: "123-45",
        };

        const result = verifyCodeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// TESTY: resetPasswordSchema
// =============================================================================

describe("resetPasswordSchema", () => {
    it("akceptuje poprawny email", () => {
        const data = {
            email: "test@example.com",
        };

        const result = resetPasswordSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca nieprawidłowy email", () => {
        const data = {
            email: "invalid",
        };

        const result = resetPasswordSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// TESTY: newPasswordSchema
// =============================================================================

describe("newPasswordSchema", () => {
    it("akceptuje poprawne hasła", () => {
        const data = {
            password: "NewPassword123!",
            confirmPassword: "NewPassword123!",
        };

        const result = newPasswordSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca gdy hasła się nie zgadzają", () => {
        const data = {
            password: "NewPassword123!",
            confirmPassword: "DifferentPassword!",
        };

        const result = newPasswordSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za krótkie hasło", () => {
        const data = {
            password: "short",
            confirmPassword: "short",
        };

        const result = newPasswordSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});
