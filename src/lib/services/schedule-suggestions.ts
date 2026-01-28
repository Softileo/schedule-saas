import {
    differenceInMinutes,
    parseISO,
    addDays,
    subDays,
    format,
} from "date-fns";
import type {
    Employee,
    LocalShift,
    ShiftTemplate,
    EmployeeAbsence,
    ShiftTemplateAssignment,
} from "@/types";
import { checkEmployeeAbsence } from "@/lib/core/schedule/utils";
import { calculateShiftHours } from "@/lib/utils/time-helpers";

interface Suggestion {
    employee: Employee;
    score: number; // 0-100
    reason: string;
    sourceShift?: LocalShift;
    staffOnSourceShiftBefore?: number; // Ile osób na zmianie kandydata PRZED przesunięciem
    staffOnSourceShiftAfter?: number; // Ile osób na zmianie kandydata PO przesunięciu
    isNeutralSwap?: boolean; // Czy to zamiana neutralna dla limitu godzin
    overtime: boolean;
}

interface SuggestionParams {
    date: string; // Target date
    targetShift?: LocalShift; // The shift we are trying to cover (if it existed) or just the date
    employees: Employee[];
    activeShifts: LocalShift[];
    employeeAbsences: EmployeeAbsence[];
    currentMonthShifts: LocalShift[]; // Needed for hours calculation
    shiftTemplates: ShiftTemplate[];
    templateAssignments: ShiftTemplateAssignment[];
    employeeHoursMap?: Map<string, { scheduled: number; required: number }>;
}

function getEmployeeFullTimeHours(employee: Employee): number {
    const defaultFullTime = 168; // ~4 weeks * 40h + some margin

    // Check if employee has custom hours defined directly
    if (employee.employment_type === "custom" && employee.custom_hours) {
        return employee.custom_hours;
    }

    switch (employee.employment_type) {
        case "half":
            return defaultFullTime / 2;
        case "three_quarter":
            return defaultFullTime * 0.75;
        case "one_third":
            return defaultFullTime / 3;
        case "custom":
            // Fallback if custom_hours not set
            return defaultFullTime;
        default:
            return defaultFullTime;
    }
}

export function getReplacementSuggestions({
    date,
    targetShift,
    employees,
    activeShifts,
    employeeAbsences,
    currentMonthShifts,
    shiftTemplates,
    templateAssignments,
    employeeHoursMap,
}: SuggestionParams): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const targetDateObj = parseISO(date);

    // Identify target template if possible
    let matchingTemplate: ShiftTemplate | undefined;
    let targetHours = 8; // Default to 8h if unknown

    if (targetShift) {
        matchingTemplate = shiftTemplates.find(
            (t) =>
                t.start_time === targetShift.start_time &&
                t.end_time === targetShift.end_time,
        );
        targetHours = calculateShiftHours(
            targetShift.start_time,
            targetShift.end_time,
            targetShift.break_minutes || 0,
        );
    }

    // Calculate basic montly hours for everyone to check relative load
    // Assuming standard month ~160h
    // Use employeeHoursMap if available for accurate data
    const calcuatedEmployeeMonthHours = new Map<string, number>();
    if (!employeeHoursMap) {
        employees.forEach((e) => {
            const hours = currentMonthShifts
                .filter((s) => s.employee_id === e.id)
                .reduce(
                    (acc, s) =>
                        acc +
                        calculateShiftHours(
                            s.start_time,
                            s.end_time,
                            s.break_minutes || 0,
                        ),
                    0,
                );
            calcuatedEmployeeMonthHours.set(e.id, hours);
        });
    }

    employees.forEach((employee) => {
        // 0. Skip if employee has absence on target date
        if (checkEmployeeAbsence(employee.id, date, employeeAbsences)) {
            return;
        }

        // 0b. Assignment Permissions Check
        // ... (unchanged) ...
        const empAssignments = templateAssignments.filter(
            (a) => a.employee_id === employee.id,
        );
        if (empAssignments.length > 0) {
            // Employee is restricted.
            if (matchingTemplate) {
                // We know the template needed.
                const hasPermission = empAssignments.some(
                    (a) => a.template_id === matchingTemplate?.id,
                );
                if (!hasPermission) {
                    // Employee cannot work this shift template.
                    return; // Strictly exclude
                }
            } else if (targetShift) {
                // We have a target shift with custom hours (no template found).
                return;
            }
        }

        const employeeShiftsToday = activeShifts.filter(
            (s) => s.employee_id === employee.id && s.date === date,
        );

        let currentHours = 0;
        let maxHours = 0;

        if (employeeHoursMap && employeeHoursMap.has(employee.id)) {
            const data = employeeHoursMap.get(employee.id)!;
            currentHours = data.scheduled;
            maxHours = data.required;
        } else {
            currentHours = calcuatedEmployeeMonthHours.get(employee.id) || 0;
            maxHours = getEmployeeFullTimeHours(employee);
        }

        // Case 1: Employee is free today (Candidates for "Normal Assignment")
        if (employeeShiftsToday.length === 0) {
            let score = 100;
            let reason = "Dostępny pracownik";

            const willBeOvertime = currentHours + targetHours > maxHours;

            // Check previous day for 11h break
            const prevDateStr = format(subDays(targetDateObj, 1), "yyyy-MM-dd");
            const prevDayShift = activeShifts.find(
                (s) => s.employee_id === employee.id && s.date === prevDateStr,
            );
            if (prevDayShift) {
                // Precise check for 11h break
                const targetStart =
                    targetShift?.start_time ||
                    matchingTemplate?.start_time ||
                    "08:00";

                const prevEndParts = prevDayShift.end_time
                    .split(":")
                    .map(Number);
                const targetStartParts = targetStart.split(":").map(Number);

                let prevShiftEndDateTime = subDays(targetDateObj, 1);
                prevShiftEndDateTime.setHours(
                    prevEndParts[0],
                    prevEndParts[1],
                    0,
                    0,
                );

                // Check if prev shift was overnight
                const prevStartParts = prevDayShift.start_time
                    .split(":")
                    .map(Number);
                const prevDurationMin =
                    prevEndParts[0] * 60 +
                    prevEndParts[1] -
                    (prevStartParts[0] * 60 + prevStartParts[1]);
                if (prevDurationMin < 0) {
                    // It ended on the target day!
                    prevShiftEndDateTime = addDays(prevShiftEndDateTime, 1);
                }

                const targetStartDateTime = new Date(targetDateObj);
                targetStartDateTime.setHours(
                    targetStartParts[0],
                    targetStartParts[1],
                    0,
                    0,
                );

                const diffMinutes = differenceInMinutes(
                    targetStartDateTime,
                    prevShiftEndDateTime,
                );

                if (diffMinutes < 660) {
                    // 11h = 660min
                    const restHours = (diffMinutes / 60).toFixed(1);
                    score = 0; // Block
                    reason += `, Naruszenie odpoczynku dobowego (${restHours}h < 11h)`;
                }
            }

            // Check overtime
            if (willBeOvertime) {
                score = 0; // Hard fail score wise
                reason += `, przekroczy limit godzin (${Math.round(
                    currentHours + targetHours,
                )}/${maxHours})`;
            } else if (currentHours > maxHours - 8) {
                // Close to limit
                score -= 20;
                reason += `, zbliża się do limitu (${Math.round(
                    currentHours,
                )}h)`;
            }

            suggestions.push({
                employee,
                score,
                reason,
                overtime: willBeOvertime,
            });
        }

        // Case 2: Employee works today (Candidates for "Swap/Move")
        // "z danej zmiany przesunac ... aby dalej mocna obsada z tej zmiany co zabralem"
        employeeShiftsToday.forEach((sourceShift) => {
            // Count people on sourceShift
            const peopleOnSourceShift = activeShifts.filter(
                (s) =>
                    s.date === date &&
                    s.start_time === sourceShift.start_time &&
                    s.end_time === sourceShift.end_time,
            ).length;

            // Identify template for source shift to know MIN requirements
            // Assumptions: activeShifts don't have template_id easily usable if created manually,
            // but we can match by time.
            const sourceTemplate = shiftTemplates.find(
                (t) =>
                    t.start_time === sourceShift.start_time &&
                    t.end_time === sourceShift.end_time,
            );

            // If template defined, use its min. If not, assume 1? Or 2 to be safe for swapping?
            // Usually swapping requires having "spare" person.
            // If min is undefined, standard logic was > 1 means we have 2, so 1 stays.
            const minRequired = sourceTemplate
                ? sourceTemplate.min_employees
                : 1;

            // Only suggest moving if removing this person doesn't violate MIN constraint
            // remaining = peopleOnSourceShift - 1
            // remaining >= minRequired  =>  peopleOnSourceShift > minRequired
            if (peopleOnSourceShift > minRequired) {
                let score = 60 + peopleOnSourceShift * 10; // Higher score if plenty of people
                if (score > 90) score = 90; // Cap slightly below "Free employee" perfection

                // Skróć czas - 15:30:00 -> 15:30
                const startTimeShort = sourceShift.start_time.slice(0, 5);
                const endTimeShort = sourceShift.end_time.slice(0, 5);

                let reason = `Możliwe przesunięcie ze zmiany ${startTimeShort}-${endTimeShort}\nBędzie: ${peopleOnSourceShift} osób ➜ ${peopleOnSourceShift - 1} osób`;
                let isNeutralSwap = false;

                // Calculate impact of swap
                const sourceHours = calculateShiftHours(
                    sourceShift.start_time,
                    sourceShift.end_time,
                    sourceShift.break_minutes || 0,
                );
                const willBeOvertime =
                    currentHours - sourceHours + targetHours > maxHours;

                // Check if they are already overworked
                if (willBeOvertime) {
                    score = 0;
                    // Usually swap preserves hours, but if target is longer or they are already over, it's bad.
                } else if (currentHours >= maxHours) {
                    // They are AT the limit, but this swap is neutral or reduces hours, so it's allowed!
                    // Boost score because this is a great way to use a "full" employee without adding overtime
                    score += 20;
                    isNeutralSwap = true;
                }

                suggestions.push({
                    employee,
                    score,
                    reason,
                    sourceShift: sourceShift,
                    staffOnSourceShiftBefore: peopleOnSourceShift,
                    staffOnSourceShiftAfter: peopleOnSourceShift - 1,
                    isNeutralSwap,
                    overtime: willBeOvertime,
                });
            }
        });
    });

    return suggestions.sort((a, b) => b.score - a.score);
}
