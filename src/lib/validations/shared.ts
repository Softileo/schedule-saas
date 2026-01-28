import { z } from "zod";

/**
 * =============================================================================
 * SHARED VALIDATION FIELDS
 * =============================================================================
 *
 * Wspólne pola walidacji używane w wielu schematach.
 * Zapewnia spójność komunikatów błędów i reguł walidacji.
 */

/**
 * Pole email z walidacją formatu
 */
export const emailField = z
    .string()
    .min(1, "Email jest wymagany")
    .email("Nieprawidłowy format email");

/**
 * Pole hasła z minimalną długością 6 znaków
 */
export const passwordField = z
    .string()
    .min(1, "Hasło jest wymagane")
    .min(6, "Hasło musi mieć minimum 6 znaków");

/**
 * Pole imię/nazwisko z minimalną długością 2 znaki
 */
export const fullNameField = z
    .string()
    .min(1, "Wymagane")
    .min(2, "Minimum 2 znaki");

/**
 * Opcjonalne pole email (puste lub poprawny email)
 */
export const optionalEmailField = z
    .string()
    .email("Nieprawidłowy format email")
    .optional()
    .or(z.literal(""));

/**
 * Pole kodu weryfikacyjnego (6 cyfr)
 */
export const verificationCodeField = z
    .string()
    .min(6, "Kod musi mieć 6 cyfr")
    .max(6, "Kod musi mieć 6 cyfr");
