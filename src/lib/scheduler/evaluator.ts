/**
 * =============================================================================
 * EWALUATOR GRAFIKU - OCENA JAKOŚCI
 * =============================================================================
 *
 * Funkcje do oceny jakości wygenerowanego grafiku.
 * Używane przez wszystkie warstwy optymalizacji.
 */

import { getRequiredHours } from "@/lib/core/schedule/work-hours";
import { getEmploymentTypeHoursPerDay } from "@/lib/constants/employment";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { DEFAULT_EMPLOYEE_COLOR } from "@/lib/constants/colors";
import { LABOR_CODE_VIOLATION_MESSAGES } from "@/lib/constants/labor-code";
import {
    POLISH_LABOR_CODE,
    type SchedulerInput,
    type GeneratedShift,
} from "./types";
import { countAbsenceDaysInMonth } from "./absence-utils";
import {
    getShiftHours,
    getShiftTimeType,
    calculateRestHours,
    daysDiff,
    getDayOfWeek,
    getAdjustedRequiredHours,
} from "./scheduler-utils";
import { DAY_KEYS, DAY_NAMES_FULL_SUNDAY_FIRST } from "@/lib/constants/days";
import { checkEmployeeAbsence } from "@/lib/core/schedule/utils";

// =============================================================================
// WAGI FUNKCJI OCENY (FITNESS)
// =============================================================================

export const WEIGHTS = {
    // HARD CONSTRAINTS - łamanie prawa
    DAILY_REST_VIOLATION: -1000,
    CONSECUTIVE_DAYS_VIOLATION: -800,
    WEEKLY_HOURS_VIOLATION: -500,
    ABSENCE_VIOLATION: -2000,

    // OBSADA - krytyczne dla biznesu
    UNDERSTAFFED_SHIFT: -300,
    EMPTY_DAY: -500,

    // SOFT CONSTRAINTS - jakość
    HOURS_IMBALANCE: -100, // Bardzo duża kara dla godzin, ale obsada ważniejsza
    WEEKEND_IMBALANCE: -200, // Zwiększony priorytet
    PREFERENCE_VIOLATION: -50,

    // RÓWNOŚĆ ZMIAN (7/7/6) - NAJWYŻSZY PRIORYTET SPOŚRÓD SOFT
    // Chodzi o to, żeby 10/4/6 było karane mocniej niż drobny brak godzin
    SHIFT_TYPE_IMBALANCE: -500,

    SHIFT_TYPE_CHANGE: -15,

    // BONUSY
    PERFECT_HOURS: +50,
    BALANCED_WEEKENDS: +30,
    GOOD_SHIFT_BLOCK: +10,
} as const;

// =============================================================================
// TYPY METRYK
// =============================================================================

export interface ScheduleMetrics {
    totalFitness: number;
    qualityPercent: number;

    // Hard constraints
    dailyRestViolations: number;
    consecutiveDaysViolations: number;
    weeklyHoursViolations: number;
    absenceViolations: number;

    // Obsada
    understaffedShifts: number;
    emptyDays: number;
    totalDays: number;
    coveredDays: number;

    // Godziny
    hoursImbalance: number;
    avgHoursDiff: number;
    maxHoursDiff: number;

    // Weekendy
    weekendImbalance: number;
    avgWeekends: number;

    // Szczegóły
    employeeStats: EmployeeStats[];
    warnings: string[];
}

export interface TemplateShiftCount {
    templateId: string;
    templateName: string;
    templateColor: string;
    templateStartTime: string;
    count: number;
}

export interface EmployeeStats {
    employeeId: string;
    employeeName: string;
    totalShifts: number;
    totalHours: number;
    requiredHours: number;
    hoursDiff: number;
    absenceHours: number; // Godziny "zjedzone" przez nieobecności
    weekendShifts: number;
    morningShifts: number;
    afternoonShifts: number;
    eveningShifts: number;
    shiftsByTemplate: TemplateShiftCount[];
    maxConsecutiveDays: number;
    violations: string[];
}

// =============================================================================
// GŁÓWNA FUNKCJA EWALUACJI
// =============================================================================

/**
 * Kompleksowa ocena jakości grafiku
 */
export function evaluateSchedule(
    shifts: GeneratedShift[],
    input: SchedulerInput,
): ScheduleMetrics {
    const {
        year,
        month,
        employees,
        templates,
        settings,
        holidays,
        workDays,
        saturdayDays,
        tradingSundays,
    } = input;

    const minEmployeesPerShift = settings.min_employees_per_shift || 1;
    const allWorkingDays = [
        ...workDays,
        ...saturdayDays,
        ...tradingSundays,
    ].sort();
    const weekendDaysSet = new Set([...saturdayDays, ...tradingSundays]);
    const tradingSundaysSet = new Set(tradingSundays);
    const holidayDates = new Set(holidays.map((h) => h.date));

    // Zakres miesiąca dla obliczania nieobecności
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
    ).padStart(2, "0")}`;

    let totalFitness = 0;
    const warnings: string[] = [];

    // Grupuj zmiany per pracownik
    const shiftsByEmployee = new Map<string, GeneratedShift[]>();
    employees.forEach((emp) => shiftsByEmployee.set(emp.id, []));
    shifts.forEach((shift) => {
        const empShifts = shiftsByEmployee.get(shift.employee_id);
        if (empShifts) empShifts.push(shift);
    });

    // Grupuj zmiany per dzień per szablon
    const shiftsByDayTemplate = new Map<
        string,
        Map<string, GeneratedShift[]>
    >();
    allWorkingDays.forEach((day) => {
        const templateMap = new Map<string, GeneratedShift[]>();
        templates.forEach((t) => templateMap.set(t.id, []));
        shiftsByDayTemplate.set(day, templateMap);
    });
    shifts.forEach((shift) => {
        const dayMap = shiftsByDayTemplate.get(shift.date);
        if (dayMap && shift.template_id) {
            const templateShifts = dayMap.get(shift.template_id);
            if (templateShifts) templateShifts.push(shift);
        }
    });

    // ==========================================================================
    // ANALIZA PER PRACOWNIK
    // ==========================================================================

    const employeeStats: EmployeeStats[] = [];
    let totalDailyRestViolations = 0;
    let totalConsecutiveViolations = 0;
    let totalWeeklyHoursViolations = 0; // Nowa metryka
    let totalAbsenceViolations = 0;
    let totalHoursImbalance = 0;
    let totalWeekendImbalance = 0;

    for (const emp of employees) {
        const empShifts = shiftsByEmployee.get(emp.id) || [];
        empShifts.sort((a, b) => a.date.localeCompare(b.date));

        let requiredHours = getRequiredHours(
            year,
            month,
            holidays,
            emp.employment_type ?? "full",
            emp.custom_hours ?? undefined,
        );

        // Oblicz godziny dzienne pracownika
        const hoursPerDay = getEmploymentTypeHoursPerDay(
            emp.employment_type ?? "full",
            emp.custom_hours ?? undefined,
        );

        // Pomniejsz requiredHours o dni nieobecności (tylko dni robocze, tylko płatne)
        let absenceHours = 0;
        if (emp.absences && emp.absences.length > 0) {
            // Odfiltruj tylko płatne nieobecności
            const paidAbsences = emp.absences.filter(
                (absence) => absence.is_paid === true,
            );

            // Policz dni nieobecności w tym miesiącu (pomiń święta i niedziele niehandlowe)
            const absenceDays = countAbsenceDaysInMonth({
                absences: paidAbsences,
                monthStart,
                monthEnd,
                holidayDates,
                tradingSundaysSet,
                settings: {
                    opening_hours: settings.opening_hours as Record<
                        string,
                        { enabled?: boolean }
                    > | null,
                },
            });

            if (absenceDays > 0) {
                absenceHours = absenceDays * hoursPerDay;
                requiredHours = Math.max(0, requiredHours - absenceHours);
            }
        }

        const totalHours = empShifts.reduce(
            (sum, s) => sum + getShiftHours(s),
            0,
        );
        const hoursDiff = totalHours - requiredHours;
        const violations: string[] = [];

        // Policz typy zmian
        let morningShifts = 0;
        let afternoonShifts = 0;
        let eveningShifts = 0;
        let weekendShifts = 0;

        // Policz zmiany per szablon
        const templateCountMap = new Map<
            string,
            { count: number; template: (typeof templates)[0] }
        >();

        empShifts.forEach((shift) => {
            const template = templates.find((t) => t.id === shift.template_id);
            const type = getShiftTimeType(shift.start_time, template?.name);
            if (type === "morning") morningShifts++;
            else if (type === "afternoon") afternoonShifts++;
            else eveningShifts++;

            if (weekendDaysSet.has(shift.date)) weekendShifts++;

            // Zlicz per szablon
            if (shift.template_id && template) {
                const existing = templateCountMap.get(shift.template_id);
                if (existing) {
                    existing.count++;
                } else {
                    templateCountMap.set(shift.template_id, {
                        count: 1,
                        template,
                    });
                }
            }
        });

        // NEW: Apply Shift Type Imbalance Penalty (Strict 7/7/6 enforcement)
        if (empShifts.length > 5) {
            const target = empShifts.length / 3;
            const dev =
                Math.abs(morningShifts - target) +
                Math.abs(afternoonShifts - target) +
                Math.abs(eveningShifts - target);
            // Karzemy każde odchylenie od idealnego podziału 33%
            totalFitness += (WEIGHTS.SHIFT_TYPE_IMBALANCE || -500) * dev;
        }

        // Konwertuj mapę na tablicę posortowaną po godzinie rozpoczęcia (najwcześniejsza pierwsza)
        const shiftsByTemplate: TemplateShiftCount[] = Array.from(
            templateCountMap.entries(),
        )
            .map(([templateId, data]) => ({
                templateId,
                templateName: `${data.template.start_time.slice(
                    0,
                    5,
                )}-${data.template.end_time.slice(0, 5)}`,
                templateColor: data.template.color || DEFAULT_EMPLOYEE_COLOR,
                templateStartTime: data.template.start_time,
                count: data.count,
            }))
            .sort((a, b) =>
                a.templateStartTime.localeCompare(b.templateStartTime),
            );

        // =======================================================================
        // SPRAWDZENIE TYGODNIOWYCH LIMITÓW GODZIN (Art. 131 § 1 KP)
        // Maksymalnie 48h/tydzień włącznie z nadgodzinami
        // =======================================================================

        // Grupujemy zmiany per tydzień (ISO 8601: tydzień zaczyna się w poniedziałek)
        const weeklyHoursMap = new Map<string, number>();

        empShifts.forEach((shift) => {
            const shiftDate = new Date(shift.date + "T00:00:00");
            const shiftHours = getShiftHours(shift);

            // Znajdź poniedziałek danego tygodnia (ISO week)
            const dayOfWeek = shiftDate.getDay(); // 0=niedziela, 1=poniedziałek
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // jeśli niedziela to -6, inaczej cofnij do poniedziałku
            const monday = new Date(shiftDate);
            monday.setDate(monday.getDate() - daysToMonday);

            const weekKey = monday.toISOString().split("T")[0]; // YYYY-MM-DD poniedziałku

            const currentWeekHours = weeklyHoursMap.get(weekKey) || 0;
            weeklyHoursMap.set(weekKey, currentWeekHours + shiftHours);
        });

        // Sprawdź czy któryś tydzień przekracza 48h (z nadgodzinami)
        let employeeWeeklyViolations = 0;
        weeklyHoursMap.forEach((hours, weekStart) => {
            if (hours > POLISH_LABOR_CODE.MAX_WEEKLY_WORK_HOURS_WITH_OVERTIME) {
                employeeWeeklyViolations++;
                const weekDate = new Date(weekStart);
                const weekStr = weekDate.toLocaleDateString("pl-PL", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                });
                violations.push(
                    `${
                        LABOR_CODE_VIOLATION_MESSAGES.WEEKLY_HOURS
                    }: tydzień ${weekStr} - ${hours.toFixed(1)}h`,
                );
                totalFitness += WEIGHTS.WEEKLY_HOURS_VIOLATION;
            }
        });

        // =======================================================================

        // Sprawdź odpoczynek 11h między zmianami
        let maxConsecutiveDays = 0;
        let currentConsecutive = 0;

        for (let i = 0; i < empShifts.length; i++) {
            const shift = empShifts[i];

            // Sprawdź absencje
            if (emp.absences) {
                for (const absence of emp.absences) {
                    if (
                        shift.date >= absence.start_date &&
                        shift.date <= absence.end_date
                    ) {
                        totalAbsenceViolations++;
                        violations.push(
                            `Praca podczas absencji: ${shift.date}`,
                        );
                        totalFitness += WEIGHTS.ABSENCE_VIOLATION;
                    }
                }
            }

            // Sprawdź odpoczynek od poprzedniej zmiany
            if (i > 0) {
                const prevShift = empShifts[i - 1];
                const restHours = calculateRestHours(
                    prevShift.date,
                    prevShift.end_time,
                    shift.date,
                    shift.start_time,
                );

                if (
                    restHours < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS &&
                    restHours > 0
                ) {
                    totalDailyRestViolations++;
                    const date1 = new Date(prevShift.date);
                    const date2 = new Date(shift.date);
                    const dateStr =
                        prevShift.date === shift.date
                            ? date1.toLocaleDateString("pl-PL", {
                                  day: "numeric",
                                  month: "short",
                              })
                            : `${date1.toLocaleDateString("pl-PL", {
                                  day: "numeric",
                                  month: "short",
                              })} → ${date2.toLocaleDateString("pl-PL", {
                                  day: "numeric",
                                  month: "short",
                              })}`;
                    violations.push(
                        `${
                            LABOR_CODE_VIOLATION_MESSAGES.DAILY_REST
                        }: ${dateStr} (${restHours.toFixed(1)}h)`,
                    );
                    totalFitness += WEIGHTS.DAILY_REST_VIOLATION;
                }

                // Sprawdź ciągłość dni
                const diff = daysDiff(prevShift.date, shift.date);
                if (diff === 1) {
                    currentConsecutive++;
                    if (
                        currentConsecutive >
                        POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS
                    ) {
                        totalConsecutiveViolations++;
                        violations.push(
                            `${
                                LABOR_CODE_VIOLATION_MESSAGES.CONSECUTIVE_DAYS
                            }: ${currentConsecutive + 1} dni`,
                        );
                        totalFitness += WEIGHTS.CONSECUTIVE_DAYS_VIOLATION;
                    }
                } else {
                    currentConsecutive = 1;
                }
                maxConsecutiveDays = Math.max(
                    maxConsecutiveDays,
                    currentConsecutive,
                );
            } else {
                currentConsecutive = 1;
            }
        }

        // Kara/bonus za godziny
        const absHoursDiff = Math.abs(hoursDiff);
        if (absHoursDiff <= 0.5) {
            totalFitness += WEIGHTS.PERFECT_HOURS;
        } else {
            totalFitness += WEIGHTS.HOURS_IMBALANCE * absHoursDiff;
            totalHoursImbalance += absHoursDiff;
        }

        // Dodaj naruszenia tygodniowe do sumy globalnej
        totalWeeklyHoursViolations += employeeWeeklyViolations;

        employeeStats.push({
            employeeId: emp.id,
            employeeName: getEmployeeFullName(emp),
            totalShifts: empShifts.length,
            totalHours: Math.round(totalHours * 10) / 10,
            requiredHours: Math.round(requiredHours),
            hoursDiff: Math.round(hoursDiff * 10) / 10,
            absenceHours: Math.round(absenceHours),
            weekendShifts,
            morningShifts,
            afternoonShifts,
            eveningShifts,
            shiftsByTemplate,
            maxConsecutiveDays,
            violations,
        });
    }

    // ==========================================================================
    // ANALIZA OBSADY
    // ==========================================================================

    let understaffedShifts = 0;
    let emptyDays = 0;
    const coveredDays = new Set<string>();

    // Pobierz mapę przypisań szablonów
    const templateAssignmentsMap = input.templateAssignmentsMap;

    for (const day of allWorkingDays) {
        const dayMap = shiftsByDayTemplate.get(day);
        if (!dayMap) continue;

        let dayHasAnyStaff = false;
        let dayHasAnyAvailableTemplate = false;

        // Pobierz dzień tygodnia dla tego dnia
        const dayOfWeek = getDayOfWeek(day);
        const dayKey = DAY_KEYS[dayOfWeek]; // "sunday", "monday", etc.
        const polishDayName = DAY_NAMES_FULL_SUNDAY_FIRST[dayOfWeek];

        for (const [templateId, templateShifts] of dayMap) {
            const template = templates.find((t) => t.id === templateId);
            const minRequired = template?.min_employees || minEmployeesPerShift;

            if (templateShifts.length > 0) dayHasAnyStaff = true;

            // Sprawdź czy szablon jest dostępny w ten dzień tygodnia
            // Jeśli szablon ma applicable_days i ten dzień nie jest w liście - pomijamy
            if (
                template?.applicable_days &&
                template.applicable_days.length > 0
            ) {
                if (!template.applicable_days.includes(dayKey as never)) {
                    continue; // Szablon nie jest dostępny w ten dzień - nie sprawdzamy obsady
                }
            }

            // Jeśli dotarliśmy tutaj, szablon jest dostępny w ten dzień
            dayHasAnyAvailableTemplate = true;

            // Sprawdź czy szablon ma przypisanych konkretnych pracowników
            // Jeśli tak - to jest szablon specjalistyczny i pomijamy ostrzeżenia
            // (bo jeśli ci pracownicy są niedostępni, to normalne że nie ma obsady)
            const assignedEmployees = templateAssignmentsMap.get(templateId);
            const isSpecialistTemplate =
                assignedEmployees && assignedEmployees.length > 0;

            // Pomijamy ostrzeżenia dla szablonów specjalistycznych (z przypisanymi pracownikami)
            if (isSpecialistTemplate) continue;

            if (templateShifts.length < minRequired) {
                // Sprawdź czy niedoobsadzenie jest spowodowane absencjami wszystkich pracowników
                // którzy mogą obsługiwać ten szablon
                const availableEmployeesForTemplate = employees.filter(
                    (emp) => {
                        // Sprawdź czy pracownik nie jest na urlopie/nieobecności w tym dniu
                        const absence = checkEmployeeAbsence(
                            emp.id,
                            day,
                            emp.absences || [],
                        );
                        if (absence) return false;

                        // Sprawdź czy pracownik może pracować w weekendy (jeśli to weekend)
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        if (
                            isWeekend &&
                            emp.preferences?.can_work_weekends === false
                        )
                            return false;

                        return true;
                    },
                );

                // Jeśli WSZYSCY pracownicy są niedostępni (urlopy) - nie karz za niedoobsadzenie
                const allOnLeave = availableEmployeesForTemplate.length === 0;

                if (!allOnLeave) {
                    // Są dostępni pracownicy ale nie ma obsady - to jest problem
                    understaffedShifts++;
                    totalFitness += WEIGHTS.UNDERSTAFFED_SHIFT;
                    warnings.push(
                        `${day} [${polishDayName}] ${
                            template?.name || templateId
                        }: ${templateShifts.length}/${minRequired} pracowników`,
                    );
                }
                // Jeśli wszyscy na urlopie - pomijamy ostrzeżenie (to nie jest wina schedulera)
            }
        }

        if (dayHasAnyStaff) {
            coveredDays.add(day);
        } else if (dayHasAnyAvailableTemplate) {
            // Sprawdź czy WSZYSCY pracownicy są na urlopie w tym dniu
            const availableAnyEmployee = employees.some((emp) => {
                const absence = checkEmployeeAbsence(
                    emp.id,
                    day,
                    emp.absences || [],
                );
                if (absence) return false;

                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                if (isWeekend && emp.preferences?.can_work_weekends === false)
                    return false;

                return true;
            });

            if (availableAnyEmployee) {
                // Są dostępni pracownicy ale brak obsady - to jest problem
                emptyDays++;
                totalFitness += WEIGHTS.EMPTY_DAY;
                warnings.push(`${day} [${polishDayName}]: BRAK OBSADY`);
            }
            // Jeśli wszyscy na urlopie - pomijamy ostrzeżenie
        }
        // Jeśli nie ma żadnych dostępnych szablonów w ten dzień - nie zgłaszamy błędu
    }

    // ==========================================================================
    // ANALIZA WEEKENDÓW
    // ==========================================================================

    const weekendCounts = employeeStats
        .filter((s) => {
            const emp = employees.find((e) => e.id === s.employeeId);
            return emp?.preferences?.can_work_weekends !== false;
        })
        .map((s) => s.weekendShifts);

    if (weekendCounts.length > 0) {
        const maxWeekends = Math.max(...weekendCounts);
        const minWeekends = Math.min(...weekendCounts);
        totalWeekendImbalance = maxWeekends - minWeekends;

        if (totalWeekendImbalance <= 1) {
            totalFitness += WEIGHTS.BALANCED_WEEKENDS;
        } else {
            totalFitness += WEIGHTS.WEEKEND_IMBALANCE * totalWeekendImbalance;
        }
    }

    // ==========================================================================
    // OBLICZ JAKOŚĆ PROCENTOWĄ
    // ==========================================================================

    // Teoretyczne maksimum (wszystko idealne)
    const maxPossibleBonus =
        employees.length * WEIGHTS.PERFECT_HOURS +
        WEIGHTS.BALANCED_WEEKENDS +
        allWorkingDays.length * templates.length * 0; // Brak kar

    // Teoretyczne minimum (wszystko źle)
    const minPossiblePenalty =
        employees.length * shifts.length * WEIGHTS.DAILY_REST_VIOLATION;

    // Normalizuj do 0-100%
    const range = maxPossibleBonus - minPossiblePenalty;
    const qualityPercent =
        range !== 0
            ? Math.max(
                  0,
                  Math.min(
                      100,
                      ((totalFitness - minPossiblePenalty) / range) * 100,
                  ),
              )
            : 50;

    return {
        totalFitness,
        qualityPercent,
        dailyRestViolations: totalDailyRestViolations,
        consecutiveDaysViolations: totalConsecutiveViolations,
        weeklyHoursViolations: totalWeeklyHoursViolations,
        absenceViolations: totalAbsenceViolations,
        understaffedShifts,
        emptyDays,
        totalDays: allWorkingDays.length,
        coveredDays: coveredDays.size,
        hoursImbalance: totalHoursImbalance,
        avgHoursDiff:
            employees.length > 0 ? totalHoursImbalance / employees.length : 0,
        maxHoursDiff: Math.max(
            ...employeeStats.map((s) => Math.abs(s.hoursDiff)),
            0,
        ),
        weekendImbalance: totalWeekendImbalance,
        avgWeekends:
            weekendCounts.length > 0
                ? weekendCounts.reduce((a, b) => a + b, 0) /
                  weekendCounts.length
                : 0,
        employeeStats,
        warnings,
    };
}

/**
 * Szybka ocena fitness (bez szczegółów) - dla algorytmu genetycznego
 */
export function quickFitness(
    shifts: GeneratedShift[],
    input: SchedulerInput,
): number {
    // Uproszczona wersja dla wydajności w pętli genetycznej
    const {
        employees,
        settings,
        holidays,
        workDays,
        saturdayDays,
        tradingSundays,
    } = input;
    const year = input.year;
    const month = input.month;

    let fitness = 0;
    const allWorkingDays = [...workDays, ...saturdayDays, ...tradingSundays];
    const minEmployees = settings.min_employees_per_shift || 1;

    // Grupuj per pracownik
    const shiftsByEmployee = new Map<string, GeneratedShift[]>();
    shifts.forEach((shift) => {
        if (!shiftsByEmployee.has(shift.employee_id)) {
            shiftsByEmployee.set(shift.employee_id, []);
        }
        shiftsByEmployee.get(shift.employee_id)!.push(shift);
    });

    // Grupuj per dzień
    const shiftsByDay = new Map<string, GeneratedShift[]>();
    allWorkingDays.forEach((day) => shiftsByDay.set(day, []));
    shifts.forEach((shift) => {
        const dayShifts = shiftsByDay.get(shift.date);
        if (dayShifts) dayShifts.push(shift);
    });

    // Sprawdź obsadę
    for (const day of allWorkingDays) {
        const dayShifts = shiftsByDay.get(day) || [];

        // Sprawdź czy są dostępni pracownicy w tym dniu (nie na urlopie)
        const dayOfWeek = new Date(day + "T00:00:00").getDay();
        const availableEmployees = employees.filter((emp) => {
            const absence = checkEmployeeAbsence(
                emp.id,
                day,
                emp.absences || [],
            );
            if (absence) return false;

            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            if (isWeekend && emp.preferences?.can_work_weekends === false)
                return false;

            return true;
        });

        // Pomijamy kary jeśli WSZYSCY pracownicy są niedostępni (urlopy)
        if (availableEmployees.length === 0) continue;

        if (dayShifts.length === 0) {
            fitness += WEIGHTS.EMPTY_DAY;
        } else if (dayShifts.length < minEmployees) {
            fitness += WEIGHTS.UNDERSTAFFED_SHIFT;
        }
    }

    // Sprawdź pracowników
    for (const emp of employees) {
        const empShifts = shiftsByEmployee.get(emp.id) || [];
        empShifts.sort((a, b) => a.date.localeCompare(b.date));

        // UWAGA: Używamy getAdjustedRequiredHours aby uwzględnić nieobecności!
        const requiredHours = getAdjustedRequiredHours(
            emp,
            year,
            month,
            holidays,
            tradingSundays,
            {
                opening_hours: settings.opening_hours as Record<
                    string,
                    { enabled?: boolean }
                > | null,
            },
        );
        const totalHours = empShifts.reduce(
            (sum, s) => sum + getShiftHours(s),
            0,
        );
        const hoursDiff = Math.abs(totalHours - requiredHours);

        // Godziny
        if (hoursDiff <= 0.5) {
            fitness += WEIGHTS.PERFECT_HOURS;
        } else {
            fitness += WEIGHTS.HOURS_IMBALANCE * hoursDiff;
        }

        // NEW: Kara za Nierówne Typy Zmian (7/7/6)
        // Obliczamy udział w każdym typie i porównujemy z ideałem 33%
        if (empShifts.length > 5) {
            // Tylko przy sensownej liczbie zmian
            const counts = { morning: 0, afternoon: 0, evening: 0 };
            for (const s of empShifts) {
                const type = getShiftTimeType(s.start_time);
                if (type === "morning") counts.morning++;
                else if (type === "afternoon") counts.afternoon++;
                else if (type === "evening") counts.evening++;
            }

            const total = empShifts.length;
            const target = total / 3;
            // Suma odchyleń od ideału
            const dev =
                Math.abs(counts.morning - target) +
                Math.abs(counts.afternoon - target) +
                Math.abs(counts.evening - target);

            // Kara (używamy nowej stałej SHIFT_TYPE_IMBALANCE, lub hardcodujemy jeśli typescript nie widzi)
            // Zakładam że WEIGHTS.SHIFT_TYPE_IMBALANCE jest zdefiniowane wyżej
            // Jeśli deweloper nie zdefiniował, używam -500
            const w = WEIGHTS.SHIFT_TYPE_IMBALANCE || -500;
            fitness += w * dev;
        }

        // Bonus za zmiany w preferowane dni pracownika (dane z bazy mogą być stringami)
        const preferredDays =
            emp.preferences?.preferred_days?.map((d: string | number) =>
                Number(d),
            ) || [];
        if (preferredDays.length > 0) {
            for (const shift of empShifts) {
                const dayOfWeek = getDayOfWeek(shift.date);
                if (preferredDays.includes(dayOfWeek)) {
                    fitness += 50; // Mały bonus za każdą zmianę w preferowany dzień
                }
            }
        }

        // Sprawdź odpoczynek i ciągłość
        let consecutive = 1;
        for (let i = 1; i < empShifts.length; i++) {
            const prev = empShifts[i - 1];
            const curr = empShifts[i];

            const rest = calculateRestHours(
                prev.date,
                prev.end_time,
                curr.date,
                curr.start_time,
            );
            if (rest > 0 && rest < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS) {
                fitness += WEIGHTS.DAILY_REST_VIOLATION;
            }

            const diff = daysDiff(prev.date, curr.date);
            if (diff === 1) {
                consecutive++;
                if (consecutive > POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS) {
                    fitness += WEIGHTS.CONSECUTIVE_DAYS_VIOLATION;
                }
            } else {
                consecutive = 1;
            }
        }
    }

    return fitness;
}
