/**
 * API Response Helpers
 *
 * Standardized API response format for all routes.
 * Ensures consistent error handling and response structure.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standard error codes
 */
export const ErrorCodes = {
    // Authentication
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",

    // Validation
    VALIDATION_ERROR: "VALIDATION_ERROR",
    INVALID_INPUT: "INVALID_INPUT",

    // Resources
    NOT_FOUND: "NOT_FOUND",
    ALREADY_EXISTS: "ALREADY_EXISTS",

    // Rate limiting
    RATE_LIMITED: "RATE_LIMITED",

    // Server
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

    // Business logic
    BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create a success response
 */
export function apiSuccess<T>(
    data: T,
    message?: string,
): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({
        success: true,
        data,
        ...(message && { message }),
    });
}

/**
 * Create an error response
 */
export function apiError(
    code: ErrorCode,
    message: string,
    status: number = 400,
    details?: unknown,
    headers?: Record<string, string>,
): NextResponse<ApiErrorResponse> {
    const errorBody: ApiErrorResponse["error"] = {
        code,
        message,
    };

    if (details !== undefined) {
        errorBody.details = details;
    }

    return NextResponse.json(
        {
            success: false,
            error: errorBody,
        },
        { status, headers },
    );
}

/**
 * Pre-built error responses for common cases
 */
export const ApiErrors = {
    unauthorized(message = "Brak autoryzacji") {
        return apiError(ErrorCodes.UNAUTHORIZED, message, 401);
    },

    forbidden(message = "Brak dostępu") {
        return apiError(ErrorCodes.FORBIDDEN, message, 403);
    },

    notFound(resource = "Zasób", message?: string) {
        return apiError(
            ErrorCodes.NOT_FOUND,
            message || `${resource} nie został znaleziony`,
            404,
        );
    },

    validationError(message: string, details?: unknown) {
        return apiError(ErrorCodes.VALIDATION_ERROR, message, 400, details);
    },

    rateLimited(retryAfterSeconds: number) {
        const response = apiError(
            ErrorCodes.RATE_LIMITED,
            "Zbyt wiele żądań. Spróbuj ponownie później.",
            429,
            { retryAfter: retryAfterSeconds },
        );
        response.headers.set("Retry-After", retryAfterSeconds.toString());
        return response;
    },

    internalError(message = "Wystąpił błąd serwera", details?: unknown) {
        return apiError(ErrorCodes.INTERNAL_ERROR, message, 500, details);
    },

    databaseError(message = "Błąd bazy danych") {
        return apiError(ErrorCodes.DATABASE_ERROR, message, 500);
    },

    businessRuleViolation(message: string, details?: unknown) {
        return apiError(
            ErrorCodes.BUSINESS_RULE_VIOLATION,
            message,
            422,
            details,
        );
    },
};

/**
 * Handle unknown errors safely
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
    logger.error("API Error:", error);

    if (error instanceof Error) {
        // Don't expose internal error messages in production
        const message =
            process.env.NODE_ENV === "development"
                ? error.message
                : "Wystąpił nieoczekiwany błąd";

        return ApiErrors.internalError(message);
    }

    return ApiErrors.internalError();
}
