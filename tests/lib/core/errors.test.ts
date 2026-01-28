/**
 * Core Errors Tests
 *
 * Testy dla klas błędów aplikacji.
 */

import { describe, it, expect } from "vitest";
import {
    AppError,
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ExternalServiceError,
    isAppError,
    getErrorMessage,
    getErrorStatusCode,
} from "@/lib/core/errors";

describe("core/errors", () => {
    // =========================================================================
    // AppError
    // =========================================================================
    describe("AppError", () => {
        it("should create error with message, code and statusCode", () => {
            const error = new AppError("Test error", "TEST_ERROR", 400);

            expect(error.message).toBe("Test error");
            expect(error.code).toBe("TEST_ERROR");
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe("AppError");
        });

        it("should default to 500 status code", () => {
            const error = new AppError("Test error", "TEST_ERROR");

            expect(error.statusCode).toBe(500);
        });

        it("should be instanceof Error", () => {
            const error = new AppError("Test", "TEST", 400);

            expect(error instanceof Error).toBe(true);
            expect(error instanceof AppError).toBe(true);
        });

        it("should serialize to JSON", () => {
            const error = new AppError("Test error", "TEST_ERROR", 400);
            const json = error.toJSON();

            expect(json).toEqual({
                name: "AppError",
                message: "Test error",
                code: "TEST_ERROR",
                statusCode: 400,
            });
        });
    });

    // =========================================================================
    // ValidationError
    // =========================================================================
    describe("ValidationError", () => {
        it("should create validation error", () => {
            const error = new ValidationError("Invalid email");

            expect(error.message).toBe("Invalid email");
            expect(error.code).toBe("VALIDATION_ERROR");
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe("ValidationError");
        });

        it("should accept optional field parameter", () => {
            const error = new ValidationError("Invalid email", "email");

            expect(error.field).toBe("email");
        });

        it("should be instanceof AppError", () => {
            const error = new ValidationError("Test");

            expect(error instanceof AppError).toBe(true);
            expect(error instanceof ValidationError).toBe(true);
        });
    });

    // =========================================================================
    // AuthError
    // =========================================================================
    describe("AuthError", () => {
        it("should create auth error with default message", () => {
            const error = new AuthError();

            expect(error.message).toBe("Brak autoryzacji");
            expect(error.code).toBe("AUTH_ERROR");
            expect(error.statusCode).toBe(401);
            expect(error.name).toBe("AuthError");
        });

        it("should accept custom message", () => {
            const error = new AuthError("Sesja wygasła");

            expect(error.message).toBe("Sesja wygasła");
        });
    });

    // =========================================================================
    // ForbiddenError
    // =========================================================================
    describe("ForbiddenError", () => {
        it("should create forbidden error with default message", () => {
            const error = new ForbiddenError();

            expect(error.message).toBe(
                "Brak uprawnień do wykonania tej operacji"
            );
            expect(error.code).toBe("FORBIDDEN_ERROR");
            expect(error.statusCode).toBe(403);
            expect(error.name).toBe("ForbiddenError");
        });

        it("should accept custom message", () => {
            const error = new ForbiddenError("Tylko admin może to zrobić");

            expect(error.message).toBe("Tylko admin może to zrobić");
        });
    });

    // =========================================================================
    // NotFoundError
    // =========================================================================
    describe("NotFoundError", () => {
        it("should create not found error with default resource", () => {
            const error = new NotFoundError();

            expect(error.message).toBe("Zasób nie został znaleziony");
            expect(error.code).toBe("NOT_FOUND_ERROR");
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe("NotFoundError");
        });

        it("should accept custom resource name", () => {
            const error = new NotFoundError("Pracownik");

            expect(error.message).toBe("Pracownik nie został znaleziony");
        });
    });

    // =========================================================================
    // ConflictError
    // =========================================================================
    describe("ConflictError", () => {
        it("should create conflict error with default message", () => {
            const error = new ConflictError();

            expect(error.message).toBe("Konflikt danych");
            expect(error.code).toBe("CONFLICT_ERROR");
            expect(error.statusCode).toBe(409);
            expect(error.name).toBe("ConflictError");
        });

        it("should accept custom message", () => {
            const error = new ConflictError("Email już istnieje");

            expect(error.message).toBe("Email już istnieje");
        });
    });

    // =========================================================================
    // RateLimitError
    // =========================================================================
    describe("RateLimitError", () => {
        it("should create rate limit error with default message", () => {
            const error = new RateLimitError();

            expect(error.message).toBe(
                "Zbyt wiele żądań. Spróbuj ponownie później."
            );
            expect(error.code).toBe("RATE_LIMIT_ERROR");
            expect(error.statusCode).toBe(429);
            expect(error.name).toBe("RateLimitError");
        });

        it("should accept custom message and retryAfter", () => {
            const error = new RateLimitError("Poczekaj chwilę", 60);

            expect(error.message).toBe("Poczekaj chwilę");
            expect(error.retryAfter).toBe(60);
        });
    });

    // =========================================================================
    // ExternalServiceError
    // =========================================================================
    describe("ExternalServiceError", () => {
        it("should create external service error", () => {
            const error = new ExternalServiceError("Supabase");

            expect(error.message).toBe("Błąd serwisu Supabase");
            expect(error.code).toBe("EXTERNAL_SERVICE_ERROR");
            expect(error.statusCode).toBe(502);
            expect(error.name).toBe("ExternalServiceError");
        });

        it("should include original error message", () => {
            const originalError = new Error("Connection refused");
            const error = new ExternalServiceError("API", originalError);

            expect(error.message).toBe("Błąd serwisu API: Connection refused");
        });

        it("should handle non-Error original error", () => {
            const error = new ExternalServiceError("API", "some string error");

            expect(error.message).toBe("Błąd serwisu API");
        });
    });

    // =========================================================================
    // isAppError
    // =========================================================================
    describe("isAppError", () => {
        it("should return true for AppError", () => {
            const error = new AppError("Test", "TEST", 400);
            expect(isAppError(error)).toBe(true);
        });

        it("should return true for subclasses", () => {
            expect(isAppError(new ValidationError("Test"))).toBe(true);
            expect(isAppError(new AuthError())).toBe(true);
            expect(isAppError(new NotFoundError())).toBe(true);
        });

        it("should return false for regular Error", () => {
            expect(isAppError(new Error("Test"))).toBe(false);
        });

        it("should return false for non-errors", () => {
            expect(isAppError("string")).toBe(false);
            expect(isAppError(null)).toBe(false);
            expect(isAppError(undefined)).toBe(false);
            expect(isAppError({ message: "test" })).toBe(false);
        });
    });

    // =========================================================================
    // getErrorMessage
    // =========================================================================
    describe("getErrorMessage", () => {
        it("should extract message from Error", () => {
            const error = new Error("Test message");
            expect(getErrorMessage(error)).toBe("Test message");
        });

        it("should extract message from AppError", () => {
            const error = new AppError("App error", "TEST", 400);
            expect(getErrorMessage(error)).toBe("App error");
        });

        it("should return string directly", () => {
            expect(getErrorMessage("Direct string")).toBe("Direct string");
        });

        it("should return default message for unknown types", () => {
            expect(getErrorMessage(null)).toBe("Wystąpił nieoczekiwany błąd");
            expect(getErrorMessage(undefined)).toBe(
                "Wystąpił nieoczekiwany błąd"
            );
            expect(getErrorMessage(123)).toBe("Wystąpił nieoczekiwany błąd");
        });
    });

    // =========================================================================
    // getErrorStatusCode
    // =========================================================================
    describe("getErrorStatusCode", () => {
        it("should return status code from AppError", () => {
            expect(getErrorStatusCode(new AppError("Test", "TEST", 400))).toBe(
                400
            );
            expect(getErrorStatusCode(new AuthError())).toBe(401);
            expect(getErrorStatusCode(new NotFoundError())).toBe(404);
        });

        it("should return 500 for regular Error", () => {
            expect(getErrorStatusCode(new Error("Test"))).toBe(500);
        });

        it("should return 500 for non-errors", () => {
            expect(getErrorStatusCode("string")).toBe(500);
            expect(getErrorStatusCode(null)).toBe(500);
        });
    });
});
