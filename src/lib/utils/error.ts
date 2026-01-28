/**
 * Error Handling Utilities
 *
 * Type-safe error handling for catch blocks.
 * Use instead of `catch (error: any)`.
 */

import { toast } from "sonner";
import { logger } from "./logger";

/**
 * Extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    if (error && typeof error === "object") {
        // Handle Supabase errors
        if (
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
        ) {
            return (error as { message: string }).message;
        }

        // Handle errors with details
        if (
            "details" in error &&
            typeof (error as { details: unknown }).details === "string"
        ) {
            return (error as { details: string }).details;
        }

        // Handle errors with error property
        if (
            "error" in error &&
            typeof (error as { error: unknown }).error === "string"
        ) {
            return (error as { error: string }).error;
        }
    }

    return "Wystąpił nieoczekiwany błąd";
}

/**
 * Logs error with consistent format
 */
export function logError(context: string, error: unknown): void {
    const message = getErrorMessage(error);
    logger.error(`[${context}] ${message}`, error);
}

/**
 * Handle error with toast notification and optional logging
 * Use this in catch blocks for consistent error handling
 *
 * @example
 * catch (error) {
 *   handleError(error, "Nie udało się zapisać");
 * }
 */
export function handleError(
    error: unknown,
    userMessage?: string,
    options?: {
        log?: boolean;
        context?: string;
    }
): void {
    const message = getErrorMessage(error);

    // Show toast to user
    toast.error(userMessage || message);

    // Log error if requested (defaults to true in development)
    if (options?.log !== false) {
        const context = options?.context || "Error";
        logger.error(`[${context}] ${message}`, error);
    }
}

/**
 * Type guard for Error objects
 */
export function isError(value: unknown): value is Error {
    return value instanceof Error;
}

/**
 * Type guard for Supabase error-like objects
 */
export function isSupabaseError(
    value: unknown
): value is { message: string; code?: string; details?: string } {
    return (
        typeof value === "object" &&
        value !== null &&
        "message" in value &&
        typeof (value as { message: unknown }).message === "string"
    );
}
