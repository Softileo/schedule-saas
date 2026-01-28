/**
 * =============================================================================
 * CUSTOM ERROR CLASSES
 * =============================================================================
 *
 * Centralne klasy błędów dla całej aplikacji.
 * Używaj tych klas zamiast zwykłego Error dla lepszej obsługi błędów.
 */

/**
 * Bazowa klasa błędu aplikacji
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500
    ) {
        super(message);
        this.name = "AppError";
        // Przywróć prototyp dla instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
        };
    }
}

/**
 * Błąd walidacji danych
 */
export class ValidationError extends AppError {
    constructor(
        message: string,
        public readonly field?: string
    ) {
        super(message, "VALIDATION_ERROR", 400);
        this.name = "ValidationError";
    }
}

/**
 * Błąd autoryzacji
 */
export class AuthError extends AppError {
    constructor(message: string = "Brak autoryzacji") {
        super(message, "AUTH_ERROR", 401);
        this.name = "AuthError";
    }
}

/**
 * Błąd uprawnień
 */
export class ForbiddenError extends AppError {
    constructor(message: string = "Brak uprawnień do wykonania tej operacji") {
        super(message, "FORBIDDEN_ERROR", 403);
        this.name = "ForbiddenError";
    }
}

/**
 * Błąd - nie znaleziono zasobu
 */
export class NotFoundError extends AppError {
    constructor(resource: string = "Zasób") {
        super(`${resource} nie został znaleziony`, "NOT_FOUND_ERROR", 404);
        this.name = "NotFoundError";
    }
}

/**
 * Błąd konfliktu (np. duplikat)
 */
export class ConflictError extends AppError {
    constructor(message: string = "Konflikt danych") {
        super(message, "CONFLICT_ERROR", 409);
        this.name = "ConflictError";
    }
}

/**
 * Błąd rate limiting
 */
export class RateLimitError extends AppError {
    constructor(
        message: string = "Zbyt wiele żądań. Spróbuj ponownie później.",
        public readonly retryAfter?: number
    ) {
        super(message, "RATE_LIMIT_ERROR", 429);
        this.name = "RateLimitError";
    }
}

/**
 * Błąd serwera zewnętrznego
 */
export class ExternalServiceError extends AppError {
    constructor(
        service: string,
        originalError?: unknown
    ) {
        const message =
            originalError instanceof Error
                ? `Błąd serwisu ${service}: ${originalError.message}`
                : `Błąd serwisu ${service}`;
        super(message, "EXTERNAL_SERVICE_ERROR", 502);
        this.name = "ExternalServiceError";
    }
}

/**
 * Helper do sprawdzania typu błędu
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Helper do wyciągania bezpiecznego message z błędu
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "Wystąpił nieoczekiwany błąd";
}

/**
 * Helper do wyciągania kodu statusu z błędu
 */
export function getErrorStatusCode(error: unknown): number {
    if (error instanceof AppError) {
        return error.statusCode;
    }
    return 500;
}
