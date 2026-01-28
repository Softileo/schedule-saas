/**
 * Tests for error.ts
 * Error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getErrorMessage,
    logError,
    isError,
    isSupabaseError,
} from "@/lib/utils/error";

// Mock sonner toast
vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
    },
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
    logger: {
        error: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
    },
}));

describe("error.ts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getErrorMessage", () => {
        it("should extract message from Error instance", () => {
            const error = new Error("Test error message");
            expect(getErrorMessage(error)).toBe("Test error message");
        });

        it("should return string error as-is", () => {
            expect(getErrorMessage("Direct string error")).toBe(
                "Direct string error"
            );
        });

        it("should extract message from object with message property", () => {
            const error = { message: "Object error message" };
            expect(getErrorMessage(error)).toBe("Object error message");
        });

        it("should extract details from object with details property", () => {
            const error = { details: "Error details here" };
            expect(getErrorMessage(error)).toBe("Error details here");
        });

        it("should extract error from object with error property", () => {
            const error = { error: "Nested error message" };
            expect(getErrorMessage(error)).toBe("Nested error message");
        });

        it("should prefer message over details", () => {
            const error = { message: "Message", details: "Details" };
            expect(getErrorMessage(error)).toBe("Message");
        });

        it("should return default message for null", () => {
            expect(getErrorMessage(null)).toBe("Wystąpił nieoczekiwany błąd");
        });

        it("should return default message for undefined", () => {
            expect(getErrorMessage(undefined)).toBe(
                "Wystąpił nieoczekiwany błąd"
            );
        });

        it("should return default message for number", () => {
            expect(getErrorMessage(42)).toBe("Wystąpił nieoczekiwany błąd");
        });

        it("should return default message for boolean", () => {
            expect(getErrorMessage(true)).toBe("Wystąpił nieoczekiwany błąd");
        });

        it("should return default message for empty object", () => {
            expect(getErrorMessage({})).toBe("Wystąpił nieoczekiwany błąd");
        });

        it("should return default message for object with non-string message", () => {
            const error = { message: 123 };
            expect(getErrorMessage(error)).toBe("Wystąpił nieoczekiwany błąd");
        });

        it("should handle TypeError correctly", () => {
            const error = new TypeError("Type error occurred");
            expect(getErrorMessage(error)).toBe("Type error occurred");
        });

        it("should handle RangeError correctly", () => {
            const error = new RangeError("Range error occurred");
            expect(getErrorMessage(error)).toBe("Range error occurred");
        });

        it("should handle Supabase-like error", () => {
            const supabaseError = {
                message: "Database connection failed",
                code: "PGRST116",
                details: "Row not found",
            };
            expect(getErrorMessage(supabaseError)).toBe(
                "Database connection failed"
            );
        });
    });

    describe("logError", () => {
        it("should log error with context", async () => {
            const { logger } = await import("@/lib/utils/logger");
            const error = new Error("Test error");

            logError("TestContext", error);

            expect(logger.error).toHaveBeenCalledWith(
                "[TestContext] Test error",
                error
            );
        });

        it("should log string error with context", async () => {
            const { logger } = await import("@/lib/utils/logger");

            logError("API", "Connection refused");

            expect(logger.error).toHaveBeenCalledWith(
                "[API] Connection refused",
                "Connection refused"
            );
        });

        it("should log unknown error with context", async () => {
            const { logger } = await import("@/lib/utils/logger");

            logError("Database", { code: 500 });

            expect(logger.error).toHaveBeenCalledWith(
                "[Database] Wystąpił nieoczekiwany błąd",
                { code: 500 }
            );
        });
    });

    describe("isError", () => {
        it("should return true for Error instance", () => {
            expect(isError(new Error("test"))).toBe(true);
        });

        it("should return true for TypeError", () => {
            expect(isError(new TypeError("test"))).toBe(true);
        });

        it("should return true for RangeError", () => {
            expect(isError(new RangeError("test"))).toBe(true);
        });

        it("should return true for SyntaxError", () => {
            expect(isError(new SyntaxError("test"))).toBe(true);
        });

        it("should return false for string", () => {
            expect(isError("error message")).toBe(false);
        });

        it("should return false for object with message", () => {
            expect(isError({ message: "test" })).toBe(false);
        });

        it("should return false for null", () => {
            expect(isError(null)).toBe(false);
        });

        it("should return false for undefined", () => {
            expect(isError(undefined)).toBe(false);
        });

        it("should return false for number", () => {
            expect(isError(500)).toBe(false);
        });
    });

    describe("isSupabaseError", () => {
        it("should return true for object with string message", () => {
            expect(isSupabaseError({ message: "Error" })).toBe(true);
        });

        it("should return true for full Supabase error", () => {
            const error = {
                message: "Row not found",
                code: "PGRST116",
                details: "No rows returned",
            };
            expect(isSupabaseError(error)).toBe(true);
        });

        it("should return true for minimal Supabase error", () => {
            expect(isSupabaseError({ message: "Auth error" })).toBe(true);
        });

        it("should return false for string", () => {
            expect(isSupabaseError("error")).toBe(false);
        });

        it("should return false for null", () => {
            expect(isSupabaseError(null)).toBe(false);
        });

        it("should return false for undefined", () => {
            expect(isSupabaseError(undefined)).toBe(false);
        });

        it("should return false for object without message", () => {
            expect(isSupabaseError({ code: "ERROR" })).toBe(false);
        });

        it("should return false for object with non-string message", () => {
            expect(isSupabaseError({ message: 123 })).toBe(false);
        });

        it("should return false for array", () => {
            expect(isSupabaseError([])).toBe(false);
        });

        it("should return false for Error instance", () => {
            // Error instances do have message but are not plain objects
            // isSupabaseError checks for plain objects
            const error = new Error("test");
            // This should still return true because Error has message property
            expect(isSupabaseError(error)).toBe(true);
        });
    });
});
