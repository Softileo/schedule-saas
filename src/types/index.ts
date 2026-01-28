export * from "./database";

export type { ScheduleViolation } from "@/lib/hooks/use-schedule-violations";

// Typ nieobecności
export type AbsenceType =
    | "vacation"
    | "sick_leave"
    | "uz"
    | "maternity"
    | "paternity"
    | "unpaid"
    | "childcare"
    | "bereavement"
    | "training"
    | "remote"
    | "blood_donation"
    | "court_summons"
    | "other";

// Etykiety typów nieobecności
export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
    vacation: "Urlop wypoczynkowy",
    sick_leave: "Zwolnienie lekarskie",
    uz: "Urlop na żądanie",
    maternity: "Urlop macierzyński",
    paternity: "Urlop ojcowski",
    unpaid: "Urlop bezpłatny",
    childcare: "Opieka nad dzieckiem",
    bereavement: "Urlop okolicznościowy",
    training: "Szkolenie",
    remote: "Praca zdalna",
    blood_donation: "Krwiodawstwo",
    court_summons: "Wezwanie sądowe",
    other: "Inna nieobecność",
};

// Kolory typów nieobecności
export const ABSENCE_TYPE_COLORS: Record<AbsenceType, string> = {
    vacation: "#10b981", // emerald-500 - zielony
    sick_leave: "#ef4444", // red-500 - czerwony
    uz: "#f59e0b", // amber-500 - pomarańczowy
    maternity: "#ec4899", // pink-500 - różowy
    paternity: "#8b5cf6", // violet-500 - fioletowy
    unpaid: "#6b7280", // gray-500 - szary
    childcare: "#06b6d4", // cyan-500 - cyjan
    bereavement: "#374151", // gray-700 - ciemnoszary
    training: "#3b82f6", // blue-500 - niebieski
    remote: "#14b8a6", // teal-500 - morski
    blood_donation: "#dc2626", // red-600 - ciemnoczerwony
    court_summons: "#7c3aed", // violet-600 - ciemny fiolet
    other: "#9ca3af", // gray-400 - jasnoszary
};

// Typ członkostwa z organizacją (używany w dashboard pages)
export interface MembershipWithOrg {
    organization_id: string;
    organizations: {
        id: string;
        name: string;
        slug: string;
        owner_id?: string;
        created_at?: string;
    } | null;
}

// Typy dla API date.nager
export interface PublicHoliday {
    date: string;
    localName: string;
    name: string;
    countryCode: string;
    fixed: boolean;
    global: boolean;
    counties: string[] | null;
    launchYear: number | null;
    types: string[];
}

// Typy dla kalkulatora godzin
export interface WorkingHoursResult {
    totalWorkingDays: number;
    totalWorkingHours: number;
    holidays: PublicHoliday[];
    saturdays: number;
}

export interface EmploymentConfig {
    type: "full" | "half" | "custom";
    customHours?: number;
}

// Typy dla grafiku
export interface ShiftWithEmployee extends Shift {
    employee: Employee;
}

export interface ScheduleWithShifts extends Schedule {
    shifts: ShiftWithEmployee[];
}

// Import Database type for aliases
import type { Database } from "./database";

// Helper type aliases for common database types
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type Shift = Database["public"]["Tables"]["shifts"]["Row"];
export type Schedule = Database["public"]["Tables"]["schedules"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember =
    Database["public"]["Tables"]["organization_members"]["Row"];
export type ShiftTemplate =
    Database["public"]["Tables"]["shift_templates"]["Row"];
export type ShiftTemplateAssignment =
    Database["public"]["Tables"]["shift_template_assignments"]["Row"];
export type EmployeeAbsence =
    Database["public"]["Tables"]["employee_absences"]["Row"];
export type OrganizationSettings =
    Database["public"]["Tables"]["organization_settings"]["Row"];
export type EmployeePreferences =
    Database["public"]["Tables"]["employee_preferences"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type HolidaysCache =
    Database["public"]["Tables"]["holidays_cache"]["Row"];

// OpeningHours - struktura godzin otwarcia (JSON w organization_settings)
export interface DayOpeningHours {
    enabled: boolean;
    open: string;
    close: string;
}

export interface OpeningHours {
    monday: DayOpeningHours;
    tuesday: DayOpeningHours;
    wednesday: DayOpeningHours;
    thursday: DayOpeningHours;
    friday: DayOpeningHours;
    saturday: DayOpeningHours;
    sunday: DayOpeningHours;
    [key: string]: DayOpeningHours; // Index signature for dynamic access
}

// Enum types
export type DayOfWeekEnum = Database["public"]["Enums"]["day_of_week"];

// DayOfWeek alias for backward compatibility
export type DayOfWeek =
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

// Typy dla organizacji z członkami
export interface OrganizationWithMembers extends Organization {
    members: OrganizationMember[];
}

// Organizacja z rolą użytkownika
export interface OrganizationWithRole {
    id: string;
    name: string;
    slug: string;
    owner_id?: string;
    is_owner: boolean;
    created_at?: string;
}

// ============================================================================
// LOCAL SHIFT TYPES (used for schedule editing with local state)
// ============================================================================

/**
 * Local shift with status tracking for optimistic updates
 */
export interface LocalShift {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number | null;
    notes: string | null;
    color: string | null;
    status: "new" | "modified" | "deleted" | "unchanged";
}

/**
 * Shift as returned from database (without status)
 */
export interface ShiftFromDB {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number | null;
    notes: string | null;
    color: string | null;
}
