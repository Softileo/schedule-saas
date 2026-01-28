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

export { useScheduleDnD } from "./use-schedule-dnd";

export { useShiftTemplates } from "./use-shift-templates";

export { useCurrentOrgSlug } from "./use-current-org-slug";

export { useCalendarDays } from "./use-calendar-days";

export { useDayStatus } from "./use-day-status";
export type { DayStatus } from "./use-day-status";

// =============================================================================
// GENERAL PURPOSE HOOKS - Hooki ogólnego przeznaczenia
// =============================================================================

export { useAsyncAction } from "./use-async-action";

export { useDialogState, useEmployeeDialogs } from "./use-dialog-state";

export { useOrgSwitch } from "./use-org-switch";

export { useAnimatedDots } from "./use-animated-dots";

export { useRegisterSaveFunction } from "./use-register-save-function";
