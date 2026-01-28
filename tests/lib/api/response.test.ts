/**
 * @fileoverview Tests for API Response helpers
 *
 * Tests for standardized API response format.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
    ErrorCodes,
    apiSuccess,
    apiError,
    ApiErrors,
    handleApiError,
} from "@/lib/api/response";

describe("ErrorCodes", () => {
    it("should have authentication error codes", () => {
        expect(ErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED");
        expect(ErrorCodes.FORBIDDEN).toBe("FORBIDDEN");
    });

    it("should have validation error codes", () => {
        expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
        expect(ErrorCodes.INVALID_INPUT).toBe("INVALID_INPUT");
    });

    it("should have resource error codes", () => {
        expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
        expect(ErrorCodes.ALREADY_EXISTS).toBe("ALREADY_EXISTS");
    });

    it("should have rate limiting error code", () => {
        expect(ErrorCodes.RATE_LIMITED).toBe("RATE_LIMITED");
    });

    it("should have server error codes", () => {
        expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
        expect(ErrorCodes.DATABASE_ERROR).toBe("DATABASE_ERROR");
    });

    it("should have business logic error code", () => {
        expect(ErrorCodes.BUSINESS_RULE_VIOLATION).toBe(
            "BUSINESS_RULE_VIOLATION"
        );
    });

    it("should have exactly 10 error codes", () => {
        const codeCount = Object.keys(ErrorCodes).length;
        expect(codeCount).toBe(10);
    });
});

describe("apiSuccess", () => {
    it("should create success response with data", async () => {
        const data = { id: "123", name: "Test" };
        const response = apiSuccess(data);

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toEqual(data);
    });

    it("should include message when provided", async () => {
        const data = { id: "123" };
        const message = "Created successfully";
        const response = apiSuccess(data, message);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toEqual(data);
        expect(json.message).toBe(message);
    });

    it("should not include message key when not provided", async () => {
        const data = { id: "123" };
        const response = apiSuccess(data);

        const json = await response.json();
        expect(json).not.toHaveProperty("message");
    });

    it("should handle array data", async () => {
        const data = [{ id: "1" }, { id: "2" }];
        const response = apiSuccess(data);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toEqual(data);
    });

    it("should handle null data", async () => {
        const response = apiSuccess(null);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toBeNull();
    });

    it("should handle empty object", async () => {
        const response = apiSuccess({});

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toEqual({});
    });
});

describe("apiError", () => {
    it("should create error response with code and message", async () => {
        const response = apiError(ErrorCodes.NOT_FOUND, "Resource not found");

        expect(response.status).toBe(400); // default status

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe("NOT_FOUND");
        expect(json.error.message).toBe("Resource not found");
    });

    it("should use custom status code", async () => {
        const response = apiError(ErrorCodes.NOT_FOUND, "Not found", 404);

        expect(response.status).toBe(404);
    });

    it("should include details when provided", async () => {
        const details = { field: "email", reason: "invalid format" };
        const response = apiError(
            ErrorCodes.VALIDATION_ERROR,
            "Validation failed",
            400,
            details
        );

        const json = await response.json();
        expect(json.error.details).toEqual(details);
    });

    it("should not include details when not provided", async () => {
        const response = apiError(ErrorCodes.NOT_FOUND, "Not found", 404);

        const json = await response.json();
        expect(json.error).not.toHaveProperty("details");
    });

    it("should handle 401 Unauthorized", async () => {
        const response = apiError(ErrorCodes.UNAUTHORIZED, "Unauthorized", 401);

        expect(response.status).toBe(401);
        const json = await response.json();
        expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should handle 500 Internal Error", async () => {
        const response = apiError(
            ErrorCodes.INTERNAL_ERROR,
            "Server error",
            500
        );

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(json.error.code).toBe("INTERNAL_ERROR");
    });
});

describe("ApiErrors", () => {
    describe("unauthorized", () => {
        it("should return 401 with default message", async () => {
            const response = ApiErrors.unauthorized();

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json.error.code).toBe("UNAUTHORIZED");
            expect(json.error.message).toBe("Brak autoryzacji");
        });

        it("should use custom message", async () => {
            const response = ApiErrors.unauthorized("Token expired");

            const json = await response.json();
            expect(json.error.message).toBe("Token expired");
        });
    });

    describe("forbidden", () => {
        it("should return 403 with default message", async () => {
            const response = ApiErrors.forbidden();

            expect(response.status).toBe(403);
            const json = await response.json();
            expect(json.error.code).toBe("FORBIDDEN");
            expect(json.error.message).toBe("Brak dostępu");
        });

        it("should use custom message", async () => {
            const response = ApiErrors.forbidden("Admin only");

            const json = await response.json();
            expect(json.error.message).toBe("Admin only");
        });
    });

    describe("notFound", () => {
        it("should return 404 with default message", async () => {
            const response = ApiErrors.notFound();

            expect(response.status).toBe(404);
            const json = await response.json();
            expect(json.error.code).toBe("NOT_FOUND");
            expect(json.error.message).toBe("Zasób nie został znaleziony");
        });

        it("should include resource name in message", async () => {
            const response = ApiErrors.notFound("Pracownik");

            const json = await response.json();
            expect(json.error.message).toBe("Pracownik nie został znaleziony");
        });

        it("should use custom message when provided", async () => {
            const response = ApiErrors.notFound(
                "User",
                "User with ID 123 not found"
            );

            const json = await response.json();
            expect(json.error.message).toBe("User with ID 123 not found");
        });
    });

    describe("validationError", () => {
        it("should return 400 with message", async () => {
            const response = ApiErrors.validationError("Invalid email format");

            expect(response.status).toBe(400);
            const json = await response.json();
            expect(json.error.code).toBe("VALIDATION_ERROR");
            expect(json.error.message).toBe("Invalid email format");
        });

        it("should include validation details", async () => {
            const details = { email: "Invalid format", password: "Too short" };
            const response = ApiErrors.validationError(
                "Validation failed",
                details
            );

            const json = await response.json();
            expect(json.error.details).toEqual(details);
        });
    });

    describe("rateLimited", () => {
        it("should return 429 with retry header", async () => {
            const response = ApiErrors.rateLimited(60);

            expect(response.status).toBe(429);
            expect(response.headers.get("Retry-After")).toBe("60");

            const json = await response.json();
            expect(json.error.code).toBe("RATE_LIMITED");
            expect(json.error.message).toBe(
                "Zbyt wiele żądań. Spróbuj ponownie później."
            );
            expect(json.error.details).toEqual({ retryAfter: 60 });
        });

        it("should set correct retry seconds in header", async () => {
            const response = ApiErrors.rateLimited(120);

            expect(response.headers.get("Retry-After")).toBe("120");
        });
    });

    describe("internalError", () => {
        it("should return 500 with default message", async () => {
            const response = ApiErrors.internalError();

            expect(response.status).toBe(500);
            const json = await response.json();
            expect(json.error.code).toBe("INTERNAL_ERROR");
            expect(json.error.message).toBe("Wystąpił błąd serwera");
        });

        it("should use custom message and details", async () => {
            const details = { stack: "Error at line 42" };
            const response = ApiErrors.internalError(
                "Database connection failed",
                details
            );

            const json = await response.json();
            expect(json.error.message).toBe("Database connection failed");
            expect(json.error.details).toEqual(details);
        });
    });

    describe("databaseError", () => {
        it("should return 500 with database error message", async () => {
            const response = ApiErrors.databaseError();

            expect(response.status).toBe(500);
            const json = await response.json();
            expect(json.error.code).toBe("DATABASE_ERROR");
            expect(json.error.message).toBe("Błąd bazy danych");
        });

        it("should use custom message", async () => {
            const response = ApiErrors.databaseError("Connection timeout");

            const json = await response.json();
            expect(json.error.message).toBe("Connection timeout");
        });
    });

    describe("businessRuleViolation", () => {
        it("should return 422 with message", async () => {
            const response = ApiErrors.businessRuleViolation(
                "Cannot delete active employee"
            );

            expect(response.status).toBe(422);
            const json = await response.json();
            expect(json.error.code).toBe("BUSINESS_RULE_VIOLATION");
            expect(json.error.message).toBe("Cannot delete active employee");
        });

        it("should include violation details", async () => {
            const details = { rule: "min_rest_hours", required: 11, actual: 8 };
            const response = ApiErrors.businessRuleViolation(
                "Rest hours violation",
                details
            );

            const json = await response.json();
            expect(json.error.details).toEqual(details);
        });
    });
});

describe("handleApiError", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("should handle Error instances", async () => {
        const error = new Error("Something went wrong");
        const response = handleApiError(error);

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(json.error.code).toBe("INTERNAL_ERROR");
    });

    it("should expose error message in development", async () => {
        vi.stubEnv("NODE_ENV", "development");

        const error = new Error("Detailed error info");
        const response = handleApiError(error);

        const json = await response.json();
        expect(json.error.message).toBe("Detailed error info");
    });

    it("should hide error message in production", async () => {
        vi.stubEnv("NODE_ENV", "production");

        const error = new Error("Sensitive error details");
        const response = handleApiError(error);

        const json = await response.json();
        expect(json.error.message).toBe("Wystąpił nieoczekiwany błąd");
    });

    it("should handle non-Error values", async () => {
        const response = handleApiError("string error");

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(json.error.code).toBe("INTERNAL_ERROR");
    });

    it("should handle null", async () => {
        const response = handleApiError(null);

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(json.error.code).toBe("INTERNAL_ERROR");
    });

    it("should handle undefined", async () => {
        const response = handleApiError(undefined);

        expect(response.status).toBe(500);
    });

    it("should handle object without message", async () => {
        const response = handleApiError({ code: 123 });

        expect(response.status).toBe(500);
    });
});
