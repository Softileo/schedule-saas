/**
 * =============================================================================
 * SCHEDULE COMPONENTS - Komponenty kalendarza grafiku
 * =============================================================================
 */

// Główny komponent kalendarza
export { ScheduleCalendarDnD } from "./views/schedule-calendar-dnd";
export type { LocalShift } from "./views/schedule-calendar-dnd";

// Widoki kalendarza
export { ScheduleHeroView } from "./views/schedule-hero-view";

// Komponenty UI
export { ActionToolbar } from "./components/action-toolbar";
export { MonthSelector } from "./components/month-selector";
export { RestViolationsWarning } from "./components/rest-violations-warning";
export { WorkHoursSummary } from "./components/work-hours-summary";
export { UpcomingHolidays } from "./components/upcoming-holidays";

// Dialogi
export { ShiftSelectorModal } from "./dialogs/shift-selector-modal";
export { SharedDialogs } from "./dialogs/shared-dialogs";

// Komponenty Drag & Drop
export { DraggableEmployee } from "./components/draggable-employee";
