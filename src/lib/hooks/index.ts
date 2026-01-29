/**
 * =============================================================================
 * CUSTOM HOOKS - Barrel Export
 * =============================================================================
 *
 * Centralne eksportowanie wszystkich hooków aplikacji.
 *
 * @example
 * import { useLocalShifts, useDialogState, useAsyncAction } from '@/lib/hooks';
 */

// =============================================================================
// SCHEDULE HOOKS - Hooki dla komponentu kalendarza
// =============================================================================

export { useLocalShifts } from "./use-local-shifts";
export type { LocalShift, ShiftFromDB } from "./use-local-shifts";

export { useRestViolations } from "./use-rest-violations";
export type { RestViolation } from "./use-rest-violations";

export { useScheduleViolations } from "./use-schedule-violations";
export type {
    ScheduleViolation,
    ViolationType,
} from "./use-schedule-violations";

export { useShiftTemplates } from "./use-shift-templates";

export { useCurrentOrgSlug } from "./use-current-org-slug";

// =============================================================================
// GENERAL PURPOSE HOOKS - Hooki ogólnego przeznaczenia
// =============================================================================

export { useAsyncAction } from "./use-async-action";

export { useEmployeeDialogs } from "./use-dialog-state";

export { useOrgSwitch } from "./use-org-switch";

export { useRegisterSaveFunction } from "./use-register-save-function";
