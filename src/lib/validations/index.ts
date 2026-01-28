/**
 * =============================================================================
 * VALIDATIONS - Barrel Export
 * =============================================================================
 *
 * Centralne eksportowanie schematów walidacji Zod.
 *
 * @example
 * import { loginSchema, employeeSchema, organizationSchema } from '@/lib/validations';
 */

// Shared schemas (pola bazowe)
export * from "./shared";

// Auth schemas
export * from "./auth";

// Employee schemas
export * from "./employee";

// Organization schemas
export * from "./organization";

// Schedule schemas
export * from "./schedule";

// Shift template validation
export * from "./shift-template";
