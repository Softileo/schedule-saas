/**
 * @fileoverview Tests for Nodemailer utility functions
 *
 * Tests for email-related pure functions.
 */

import { describe, it, expect } from "vitest";
import { generateVerificationCode } from "@/lib/email/nodemailer";

describe("generateVerificationCode", () => {
    it("should generate a 6-digit code", () => {
        const code = generateVerificationCode();
        expect(code).toHaveLength(6);
    });

    it("should generate only numeric characters", () => {
        const code = generateVerificationCode();
        expect(code).toMatch(/^\d{6}$/);
    });

    it("should generate codes in valid range (100000-999999)", () => {
        for (let i = 0; i < 100; i++) {
            const code = generateVerificationCode();
            const num = parseInt(code, 10);
            expect(num).toBeGreaterThanOrEqual(100000);
            expect(num).toBeLessThanOrEqual(999999);
        }
    });

    it("should not generate codes starting with 0", () => {
        for (let i = 0; i < 100; i++) {
            const code = generateVerificationCode();
            expect(code[0]).not.toBe("0");
        }
    });

    it("should generate unique codes (statistical test)", () => {
        const codes = new Set<string>();
        const iterations = 1000;

        for (let i = 0; i < iterations; i++) {
            codes.add(generateVerificationCode());
        }

        // Should have very high uniqueness (allow for some collisions due to randomness)
        expect(codes.size).toBeGreaterThan(iterations * 0.95);
    });

    it("should return string type", () => {
        const code = generateVerificationCode();
        expect(typeof code).toBe("string");
    });

    it("should be parseable as integer", () => {
        const code = generateVerificationCode();
        const parsed = parseInt(code, 10);
        expect(Number.isNaN(parsed)).toBe(false);
        expect(Number.isInteger(parsed)).toBe(true);
    });
});
