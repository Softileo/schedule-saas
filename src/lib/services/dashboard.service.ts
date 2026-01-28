/**
 * Dashboard Service
 *
 * Business logic for dashboard statistics and data.
 * Extracted from app/(dashboard)/panel/page.tsx
 */

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { parseISO, isSaturday, isSunday } from "date-fns";
import { isTradingSunday, formatDateToISO } from "@/lib/core/schedule/utils";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { DEFAULT_EMPLOYEE_COLOR } from "@/lib/constants/colors";
import type { OrganizationSettings, AbsenceType } from "@/types";
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from "@/types";

/** Typ dla nieobecności z danymi pracownika z JOINa Supabase */
interface AbsenceWithEmployee {
    id: string;
    absence_type: string;
    start_date: string;
    end_date: string;
    employees: {
        id: string;
        first_name: string;
        last_name: string;
        color: string | null;
    };
}

export interface TemplateShiftCount {
    templateId: string;
    templateName: string;
    templateColor: string;
    templateStartTime: string;
    count: number;
}

export interface EmployeeShiftStats {
    name: string;
    color: string;
    weekends: number;
    tradingSundays: number;
    shiftsByTemplate: TemplateShiftCount[];
    totalShifts: number;
    // Legacy fields for backwards compatibility
    morningShifts: number;
    afternoonShifts: number;
    eveningShifts: number;
}

export interface ShiftTemplate {
    id: string;
    name: string;
    color: string;
    start_time: string;
    end_time: string;
}

export interface YearlyEmployeeStats extends EmployeeShiftStats {
    year: number;
}

export interface ScheduleInfo {
    id: string;
    year: number;
    month: number;
    status: string;
    shiftsCount: number;
}

export interface UpcomingAbsence {
    id: string;
    employeeName: string;
    employeeColor: string;
    absenceType: AbsenceType;
    absenceLabel: string;
    absenceColor: string;
    startDate: string;
    endDate: string;
    daysCount: number;
}

export interface DashboardStats {
    employeeCount: number;
    totalShiftsThisMonth: number;
    employeeStats: EmployeeShiftStats[];
    yearlyStats: Record<number, EmployeeShiftStats[]>;
    recentSchedules: ScheduleInfo[];
    availableYears: number[];
    templates: ShiftTemplate[];
    upcomingAbsences: UpcomingAbsence[];
}

export function hasEmployeeStats(
    stats?: EmployeeShiftStats[],
): boolean {
    if (!Array.isArray(stats) || stats.length === 0) return false;

    return stats.some((stat) => stat.totalShifts > 0);
}

/**
 * Calculate employee shift statistics from all shifts with dynamic templates
 */
function calculateEmployeeStats(
    employees: Array<{
        id: string;
        first_name: string;
        last_name: string;
        color: string | null;
    }>,
    allShifts: Array<{
        employee_id: string;
        date: string;
        start_time: string;
        end_time: string;
    }>,
    templates: ShiftTemplate[],
    orgSettings: OrganizationSettings | null
): EmployeeShiftStats[] {
    const stats = employees.map((emp) => {
        const empShifts = allShifts.filter((s) => s.employee_id === emp.id);

        let weekends = 0;
        let tradingSundaysCount = 0;

        // Count shifts per template
        const templateCountMap = new Map<string, number>();

        empShifts.forEach((shift) => {
            const shiftDate = parseISO(shift.date);
            const isSat = isSaturday(shiftDate);
            const isSun = isSunday(shiftDate);
            const isTradingSun =
                isSun && isTradingSunday(shiftDate, orgSettings);

            // Saturdays count as weekends
            if (isSat) {
                weekends++;
            }

            // Trading Sundays
            if (isTradingSun) {
                tradingSundaysCount++;
            }

            // Count by template (matching by start_time AND end_time)
            const matchingTemplate = templates.find(
                (t) =>
                    t.start_time === shift.start_time &&
                    t.end_time === shift.end_time
            );
            if (matchingTemplate) {
                const current = templateCountMap.get(matchingTemplate.id) || 0;
                templateCountMap.set(matchingTemplate.id, current + 1);
            }
        });

        // Convert to array with template info, sorted by start time
        const shiftsByTemplate: TemplateShiftCount[] = Array.from(
            templateCountMap.entries()
        )
            .map(([templateId, count]) => {
                const template = templates.find((t) => t.id === templateId);
                return {
                    templateId,
                    templateName: template?.name || "Nieznany",
                    templateColor: template?.color || DEFAULT_EMPLOYEE_COLOR,
                    templateStartTime: template?.start_time || "00:00",
                    count,
                };
            })
            .sort((a, b) =>
                a.templateStartTime.localeCompare(b.templateStartTime)
            );

        return {
            name: getEmployeeFullName(emp),
            color: emp.color || DEFAULT_EMPLOYEE_COLOR,
            weekends,
            tradingSundays: tradingSundaysCount,
            shiftsByTemplate,
            totalShifts: empShifts.length,
            // Legacy fields (not used anymore but kept for backwards compatibility)
            morningShifts: 0,
            afternoonShifts: 0,
            eveningShifts: 0,
        };
    });

    // Sort by total shifts descending
    return stats.sort((a, b) => b.totalShifts - a.totalShifts);
}



/**
 * Get dashboard statistics for an organization
 */
export async function getDashboardStats(
    organizationId: string,
    year: number,
    month: number
): Promise<DashboardStats> {
    const supabase = await createClient();

    const today = formatDateToISO(new Date());

    // OPTIMIZED: Parallel queries for independent data
    const [
        { count: employeeCount },
        { data: currentSchedule },
        { data: employees },
        { data: orgSettings },
        { data: shiftTemplates },
        { data: absencesData },
    ] = await Promise.all([
        // Get employee count
        supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("is_active", true),
        // Get current month schedule
        supabase
            .from("schedules")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("year", year)
            .eq("month", month)
            .single(),
        // Get employees
        supabase
            .from("employees")
            .select("id, first_name, last_name, color")
            .eq("organization_id", organizationId)
            .eq("is_active", true),
        // Get org settings
        supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", organizationId)
            .single(),
        // Get shift templates
        supabase
            .from("shift_templates")
            .select("id, name, color, start_time, end_time")
            .eq("organization_id", organizationId)
            .order("start_time", { ascending: true }),
        // Get upcoming absences (current and future)
        supabase
            .from("employee_absences")
            .select(
                `
                id,
                absence_type,
                start_date,
                end_date,
                employees!inner(id, first_name, last_name, color)
            `
            )
            .eq("organization_id", organizationId)
            .gte("end_date", today)
            .order("start_date", { ascending: true })
            .limit(10),
    ]);

    // Process upcoming absences
    const upcomingAbsences: UpcomingAbsence[] = (
        (absencesData || []) as AbsenceWithEmployee[]
    ).map((absence) => {
        const startDate = parseISO(absence.start_date);
        const endDate = parseISO(absence.end_date);
        const daysCount =
            Math.ceil(
                (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
            ) + 1;

        const employee = absence.employees;
        return {
            id: absence.id,
            employeeName: getEmployeeFullName(employee),
            employeeColor: employee?.color || DEFAULT_EMPLOYEE_COLOR,
            absenceType: absence.absence_type as AbsenceType,
            absenceLabel:
                ABSENCE_TYPE_LABELS[absence.absence_type as AbsenceType],
            absenceColor:
                ABSENCE_TYPE_COLORS[absence.absence_type as AbsenceType],
            startDate: absence.start_date,
            endDate: absence.end_date,
            daysCount,
        };
    });

    // Continue with shift_templates query processing
    const templates: ShiftTemplate[] = (shiftTemplates || []).map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || DEFAULT_EMPLOYEE_COLOR,
        start_time: t.start_time,
        end_time: t.end_time,
    }));

    // Get shifts count for current month (depends on currentSchedule)
    let totalShiftsThisMonth = 0;
    if (currentSchedule) {
        const { count: shiftsCount } = await supabase
            .from("shifts")
            .select("*", { count: "exact", head: true })
            .eq("schedule_id", currentSchedule.id);
        totalShiftsThisMonth = shiftsCount || 0;
    }

    let employeeStats: EmployeeShiftStats[] = [];

    // NAPRAWIONE: Statystyki dla bieżącego miesiąca - tylko z currentSchedule
    if (employees && currentSchedule) {
        const { data: currentMonthShifts } = await supabase
            .from("shifts")
            .select("employee_id, date, start_time, end_time")
            .eq("schedule_id", currentSchedule.id);

        if (currentMonthShifts) {
            employeeStats = calculateEmployeeStats(
                employees,
                currentMonthShifts,
                templates,
                orgSettings as OrganizationSettings | null
            );
        }
    } else if (employees) {
        // Brak grafiku na ten miesiąc - pokaż pracowników z zerowymi statystykami
        employeeStats = employees.map((emp) => ({
            name: getEmployeeFullName(emp),
            color: emp.color || DEFAULT_EMPLOYEE_COLOR,
            weekends: 0,
            tradingSundays: 0,
            shiftsByTemplate: [],
            totalShifts: 0,
            morningShifts: 0,
            afternoonShifts: 0,
            eveningShifts: 0,
        }));
    }

    // Get schedules grouped by year for yearly stats
    const { data: allSchedulesWithYear } = await supabase
        .from("schedules")
        .select("id, year")
        .eq("organization_id", organizationId);

    // Calculate yearly stats - OPTIMIZED: Single query for all shifts
    const yearlyStats: Record<number, EmployeeShiftStats[]> = {};
    const availableYears: number[] = [];

    if (employees && allSchedulesWithYear && allSchedulesWithYear.length > 0) {
        // Get unique years
        const yearsSet = new Set(allSchedulesWithYear.map((s) => s.year));
        availableYears.push(...Array.from(yearsSet).sort((a, b) => b - a));

        // Create schedule ID to year mapping for O(1) lookup
        const scheduleIdToYear = new Map(
            allSchedulesWithYear.map((s) => [s.id, s.year])
        );
        const allScheduleIds = allSchedulesWithYear.map((s) => s.id);

        // OPTIMIZED: Fetch ALL shifts in a single query instead of N queries
        const { data: allYearShifts } = await supabase
            .from("shifts")
            .select("employee_id, date, start_time, end_time, schedule_id")
            .in("schedule_id", allScheduleIds);

        if (allYearShifts && employees) {
            // Group shifts by year using the mapping
            const shiftsByYear = allYearShifts.reduce(
                (acc, shift) => {
                    const shiftYear = scheduleIdToYear.get(shift.schedule_id);
                    if (shiftYear !== undefined) {
                        (acc[shiftYear] ||= []).push(shift);
                    }
                    return acc;
                },
                {} as Record<
                    number,
                    Array<{
                        employee_id: string;
                        date: string;
                        start_time: string;
                        end_time: string;
                    }>
                >
            );

            // Calculate stats for each year from grouped data
            for (const yr of availableYears) {
                const yearShifts = shiftsByYear[yr] || [];
                yearlyStats[yr] = calculateEmployeeStats(
                    employees,
                    yearShifts,
                    templates,
                    orgSettings as OrganizationSettings | null
                );
            }
        }
    }

    // Get recent schedules (last 24 months)
    const { data: recentSchedulesData } = await supabase
        .from("schedules")
        .select("id, year, month, is_published")
        .eq("organization_id", organizationId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(24);

    let recentSchedules: ScheduleInfo[] = [];

    if (recentSchedulesData && recentSchedulesData.length > 0) {
        const scheduleIds = recentSchedulesData.map((s) => s.id);

        // OPTIMIZED: Single query with GROUP BY instead of N count queries
        const { data: shiftsCountData } = await supabase
            .from("shifts")
            .select("schedule_id")
            .in("schedule_id", scheduleIds);

        // Count shifts per schedule in memory (much faster than N DB queries)
        const countsMap = (shiftsCountData || []).reduce((acc, shift) => {
            acc[shift.schedule_id] = (acc[shift.schedule_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        recentSchedules = recentSchedulesData.map((schedule) => ({
            id: schedule.id,
            year: schedule.year,
            month: schedule.month,
            status: schedule.is_published ? "published" : "draft",
            shiftsCount: countsMap[schedule.id] || 0,
        }));
    }

    return {
        employeeCount: employeeCount || 0,
        totalShiftsThisMonth,
        employeeStats,
        yearlyStats,
        recentSchedules,
        availableYears,
        templates,
        upcomingAbsences,
    };
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return "Dzień dobry";
    if (hour >= 12 && hour < 18) return "Cześć";
    if (hour >= 18 && hour < 22) return "Dobry wieczór";
    return "Witaj w nocy";
}

/**
 * Get user's first name from full name
 */
export function getFirstName(fullName: string | null): string {
    return fullName?.split(" ")[0] || "Użytkowniku";
}

/**
 * Cached version of getDashboardStats (per-request deduplication)
 * Uses React.cache() to deduplicate calls within the same request
 * This is safe to use with cookies() unlike unstable_cache
 */
export const getCachedDashboardStats = cache(getDashboardStats);
