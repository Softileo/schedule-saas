import { logger } from "@/lib/utils/logger";
import { type SchedulerContext } from "../scheduler-context";
import { type EmployeeScheduleState } from "../../types";
import {
    getTemplateHours,
    getShiftTimeType,
    getDayOfWeek,
    calculateRestHours,
} from "../../scheduler-utils";
import {
    calculateHoursDeficit,
    calculateHoursSurplus,
} from "../../greedy/helpers";
import { SIGNIFICANT_HOURS_DEFICIT } from "../../greedy/config"; // Assuming this is correct import from original file logic
import { canEmployeeWorkOnDate } from "../../validation";
import { DAY_KEYS } from "@/lib/constants/days";
import { POLISH_LABOR_CODE } from "@/lib/constants/labor-code";
import type { ShiftTemplate } from "@/types";

export class FillHoursStep {
    fillMissingHours(context: SchedulerContext): void {
        logger.log("\n--- KROK 2: Uzupełnianie brakujących godzin ---");

        const { employeeStates } = context;

        // Sortuj pracowników: najpierw ci z NAJWIĘKSZYM deficytem procentowym
        // Dzięki temu "lepsi" pracownicy (pełny etat) mają pierwszeństwo w wyborze lepszych dni
        const sortedEmployees = Array.from(employeeStates.values()).sort(
            (a, b) => {
                const deficitA = a.requiredHours - a.currentHours;
                const deficitB = b.requiredHours - b.currentHours;
                const ratioA = deficitA / (a.requiredHours || 1);
                const ratioB = deficitB / (b.requiredHours || 1);
                return ratioB - ratioA; // Od największego deficytu
            },
        );

        let addedShifts = 0;
        for (const state of sortedEmployees) {
            // Próbuj uzupełnić godziny w pętli (bo jedna zmiana może nie wystarczyć)
            // Zwiększ limit prób, aby zapewnić pełne etaty nawet przy trudnym grafiku
            let attempts = 0;
            const MAX_ATTEMPTS = 60; // Bezpieczny margines na cały miesiąc

            while (
                calculateHoursDeficit(state) > SIGNIFICANT_HOURS_DEFICIT &&
                attempts < MAX_ATTEMPTS
            ) {
                // Jeśli pozostało bardzo mało godzin (< 4), trudno coś znaleźć
                // Ale idź dalej, addShiftToLeastStaffedDay spróbuje custom shift
                const success = this.addShiftToLeastStaffedDay(state, context);
                if (success) {
                    addedShifts++;
                } else {
                    // Jeśli standardowe dodanie się nie powiodło, spróbuj ZAMIANY (Swap)
                    // Pozwala to "odblokować" miejsce zajęte przez kogoś, kto może pracować gdzie indziej
                    const swapSuccess = this.tryAddShiftWithSwap(
                        state,
                        context,
                    );
                    if (swapSuccess) {
                        addedShifts++;
                        logger.log(
                            `  🔀 Zamiana udana dla ${state.emp.first_name}`,
                        );
                    } else {
                        // Nie udało się dodać zmiany ani normalnie, ani przez zamianę - przerywamy dla tego pracownika
                        break;
                    }
                }
                attempts++;
            }
        }
        logger.log(
            `Zakończono uzupełnianie godzin. Dodano ${addedShifts} zmian.`,
        );
    }

    private tryAddShiftWithSwap(
        state: EmployeeScheduleState,
        context: SchedulerContext,
    ): boolean {
        const { allWorkingDays, dailyTemplateStaffing, shiftManager } = context;

        // Collect all potential "blocked" opportunities
        const blockedOpportunities: { day: string; template: ShiftTemplate }[] =
            [];

        for (const day of allWorkingDays) {
            if (state.occupiedDates.has(day)) continue;
            if (!canEmployeeWorkOnDate(state.emp, day, context.input.holidays))
                continue;

            const dayTemplateMap = dailyTemplateStaffing.get(day);
            if (!dayTemplateMap) continue;

            for (const t of state.availableTemplates) {
                const dayKey = DAY_KEYS[getDayOfWeek(day)];
                if (
                    t.applicable_days?.length &&
                    !t.applicable_days.includes(dayKey as never)
                )
                    continue;

                if (!this.canAddShift(state, day, t, context)) continue;

                const templateHours = getTemplateHours(t);
                if (
                    state.currentHours + templateHours >
                    state.requiredHours + 0.5
                )
                    continue;

                const currentStaff = dayTemplateMap.get(t.id) || [];
                const max = t.max_employees;

                // We only perform this logic if the slot is BLOCKED by max employees
                if (
                    max !== undefined &&
                    max !== null &&
                    currentStaff.length >= max
                ) {
                    blockedOpportunities.push({ day, template: t });
                }
            }
        }

        blockedOpportunities.sort(() => Math.random() - 0.5);

        for (const opp of blockedOpportunities) {
            const { day, template } = opp;
            const currentStaff =
                dailyTemplateStaffing.get(day)?.get(template.id) || [];

            // Try to move an incumbent
            for (const shift of currentStaff) {
                const incumbentState = context.employeeStates.get(
                    shift.employee_id,
                );
                if (!incumbentState) continue;

                if (
                    this.tryMoveIncumbent(
                        incumbentState,
                        day,
                        template,
                        context,
                    )
                ) {
                    shiftManager.addShift(state.emp.id, day, template);
                    return true;
                }
            }
        }

        return false;
    }

    private tryMoveIncumbent(
        incumbentState: EmployeeScheduleState,
        currentDay: string,
        currentTemplate: ShiftTemplate,
        context: SchedulerContext,
    ): boolean {
        const { allWorkingDays, dailyTemplateStaffing, shiftManager } = context;
        const currentTemplateHours = getTemplateHours(currentTemplate);

        const candidateDays = [...allWorkingDays].sort(
            () => Math.random() - 0.5,
        );

        for (const targetDay of candidateDays) {
            if (targetDay !== currentDay) {
                if (incumbentState.occupiedDates.has(targetDay)) continue;
                if (
                    !canEmployeeWorkOnDate(
                        incumbentState.emp,
                        targetDay,
                        context.input.holidays,
                    )
                )
                    continue;
            }

            const dayTemplateMap = dailyTemplateStaffing.get(targetDay);
            if (!dayTemplateMap) continue;

            for (const t of incumbentState.availableTemplates) {
                if (targetDay === currentDay && t.id === currentTemplate.id)
                    continue;

                const dayKey = DAY_KEYS[getDayOfWeek(targetDay)];
                if (
                    t.applicable_days?.length &&
                    !t.applicable_days.includes(dayKey as never)
                )
                    continue;

                const targetStaff = dayTemplateMap.get(t.id) || [];
                const max = t.max_employees;
                if (
                    max !== undefined &&
                    max !== null &&
                    targetStaff.length >= max
                )
                    continue;

                const targetHours = getTemplateHours(t);
                if (Math.abs(targetHours - currentTemplateHours) > 1) continue;

                if (targetDay === currentDay) {
                    if (
                        !context.candidateFinder.checkDailyRest(
                            incumbentState,
                            targetDay,
                            t,
                        )
                    )
                        continue;
                } else {
                    if (
                        !this.canAddShift(incumbentState, targetDay, t, context)
                    )
                        continue;
                }

                // Execute Move
                const shiftToRemove = incumbentState.shifts.find(
                    (s) =>
                        s.date === currentDay &&
                        s.template_id === currentTemplate.id,
                );
                if (!shiftToRemove) continue;

                shiftManager.removeShift(incumbentState.emp.id, shiftToRemove);
                shiftManager.addShift(incumbentState.emp.id, targetDay, t);

                logger.log(
                    `    ↪ Przesunięto ${incumbentState.emp.first_name} z ${currentDay} do ${targetDay}`,
                );
                return true;
            }
        }
        return false;
    }

    private addShiftToLeastStaffedDay(
        state: EmployeeScheduleState,
        context: SchedulerContext,
    ): boolean {
        const {
            dailyStaffing,
            allWorkingDays,
            weekendDaysSet,
            saturdaysSet,
            tradingSundaysSet,
            dailyTemplateStaffing,
            shiftManager,
        } = context;
        const deficit = state.requiredHours - state.currentHours;

        const preferredDays =
            state.emp.preferences?.preferred_days?.map((d: string | number) =>
                Number(d),
            ) || [];

        const daysWithStaffing = allWorkingDays
            .filter((day) => !state.occupiedDates.has(day))
            .map((day) => {
                const dayOfWeek = getDayOfWeek(day);
                return {
                    day,
                    staffing: dailyStaffing.get(day)?.length || 0,
                    isWeekend: weekendDaysSet.has(day),
                    isTradingSunday: tradingSundaysSet.has(day),
                    isSaturday: saturdaysSet.has(day),
                    isPreferred: preferredDays.includes(dayOfWeek),
                };
            })
            .sort((a, b) => {
                if (a.staffing !== b.staffing) {
                    return a.staffing - b.staffing;
                }
                if (a.isPreferred && !b.isPreferred) return -1;
                if (!a.isPreferred && b.isPreferred) return 1;

                if (a.isTradingSunday && !b.isTradingSunday) return -1;
                if (!a.isTradingSunday && b.isTradingSunday) return 1;
                if (a.isSaturday && !b.isSaturday) return 1;
                if (!a.isSaturday && b.isSaturday) return -1;

                return a.day.localeCompare(b.day);
            });

        for (const { day } of daysWithStaffing) {
            if (deficit >= 4 && deficit <= 7.5) {
                const perfectMatch = state.availableTemplates.some((t) => {
                    const templateHours = getTemplateHours(t);
                    return (
                        Math.abs(
                            state.currentHours +
                                templateHours -
                                state.requiredHours,
                        ) <= 0.5
                    );
                });

                if (!perfectMatch) {
                    const customShiftAdded = this.tryAddCustomShift(
                        state,
                        day,
                        deficit,
                        context,
                    );
                    if (customShiftAdded) {
                        return true;
                    }
                }
            }

            const dayTemplateMap = dailyTemplateStaffing.get(day);
            if (!dayTemplateMap) continue;

            const dayOfWeek = getDayOfWeek(day);
            const dayKey = DAY_KEYS[dayOfWeek];

            const templatesWithScore = state.availableTemplates
                .filter((t) => {
                    if (t.applicable_days && t.applicable_days.length > 0) {
                        if (!t.applicable_days.includes(dayKey as never)) {
                            return false;
                        }
                    }

                    if (!this.canAddShift(state, day, t, context)) {
                        return false;
                    }

                    const templateHours = getTemplateHours(t);
                    if (
                        state.currentHours + templateHours >
                        state.requiredHours + 0.5
                    ) {
                        return false;
                    }

                    if (
                        t.max_employees !== null &&
                        t.max_employees !== undefined
                    ) {
                        const templateStaffing =
                            dayTemplateMap.get(t.id)?.length || 0;
                        if (templateStaffing >= t.max_employees) {
                            return false;
                        }
                    }
                    return true;
                })
                .map((t) => {
                    const timeType = getShiftTimeType(t.start_time);
                    const templateHours = getTemplateHours(t);
                    const afterHours = state.currentHours + templateHours;
                    const remaining = state.requiredHours - afterHours;

                    let score = 0;

                    if (Math.abs(remaining) <= 0.5) {
                        score += 10000;
                    } else if (remaining > 0 && remaining <= 2) {
                        score += 7000;
                    } else if (remaining > 0 && remaining <= 4) {
                        score += 4000;
                    } else {
                        score += (deficit - remaining) * 100;
                    }

                    if (remaining > 0) {
                        const hasMatchingTemplate =
                            state.availableTemplates.some((other) => {
                                if (other.id === t.id) return false;
                                const otherHours = getTemplateHours(other);
                                return Math.abs(otherHours - remaining) <= 1;
                            });
                        if (hasMatchingTemplate) {
                            score += 2000;
                        }
                    }

                    const totalShifts =
                        state.morningShiftCount +
                        state.afternoonShiftCount +
                        state.eveningShiftCount;
                    const avgPerType = totalShifts / 3;
                    const morningDiff = state.morningShiftCount - avgPerType;
                    const afternoonDiff =
                        state.afternoonShiftCount - avgPerType;
                    const eveningDiff = state.eveningShiftCount - avgPerType;

                    let balanceScore = 0;
                    if (timeType === "morning") balanceScore = -morningDiff;
                    else if (timeType === "afternoon")
                        balanceScore = -afternoonDiff;
                    else balanceScore = -eveningDiff;

                    const variance =
                        morningDiff * morningDiff +
                        afternoonDiff * afternoonDiff +
                        eveningDiff * eveningDiff;

                    score += balanceScore * 300;
                    score -= variance * 50;

                    // --- NEW: Staffing Balance Penalty (Load Balancing) ---
                    // Penalize templates that already have many employees assigned
                    // to encourage spreading the load evenly across the day.
                    const currentTemplateStaffing =
                        dayTemplateMap.get(t.id)?.length || 0;
                    score -= currentTemplateStaffing * 500;

                    // --- NEW: Template Usage Balancing for Employee ---
                    // Count how many times this specific template has been used for this employee
                    const shiftTemplateCount = state.shifts.filter(
                        (s) => s.template_id === t.id,
                    ).length;

                    // Count total shifts assigned to employee to calculate average
                    // const totalAssignedRefShifts = state.shifts.length;

                    // If employee has assigned templates via assignments, we should balance between them
                    const assignedTemplateIds =
                        context.input.templateAssignmentsMap.get(
                            state.emp.id,
                        ) || [];

                    if (assignedTemplateIds.length > 0) {
                        // If this template is one of the assigned ones
                        if (assignedTemplateIds.includes(t.id)) {
                            // Calculate expected average if distributed evenly among assigned types
                            // Note: This is an approximation. Ideally we'd know total target shifts.
                            // But checking deviation from OTHER assigned templates works too.

                            // Penalize if this template is used more than others
                            // Simple approach: score -= count * weight
                            score -= shiftTemplateCount * 2000;

                            // Boost if it's an assigned template
                            score += 5000;
                        } else {
                            // If employee has specific assignments but this is NOT one of them
                            // drastically lower score unless necessary
                            score -= 10000;
                        }
                    } else {
                        // No specific assignments, just general balancing
                        score -= shiftTemplateCount * 500;
                    }

                    const preferredDaysNums =
                        state.emp.preferences?.preferred_days?.map(
                            (d: string | number) => Number(d),
                        ) || [];
                    if (preferredDaysNums.includes(dayOfWeek)) {
                        score += 1000;
                    }

                    return { template: t, score };
                })
                .sort((a, b) => b.score - a.score);

            if (templatesWithScore.length > 0) {
                const best = templatesWithScore[0];
                shiftManager.addShift(state.emp.id, day, best.template);
                logger.log(
                    `  + [Krok 2] ${state.emp.first_name}: ${
                        best.template.name
                    } w ${day} (score: ${Math.round(best.score)})`,
                );
                return true;
            }
        }
        return false;
    }

    private tryAddCustomShift(
        _state: EmployeeScheduleState,
        _date: string,
        _hoursNeeded: number,
        _context: SchedulerContext,
    ): boolean {
        // STRICT MODE: Custom shifts are disabled to prevent bypassing constraints.
        // We only use strictly defined templates to ensure MAX/MIN limits and Applicable Days are respected.
        return false;
    }

    private canAddCustomShift(
        state: EmployeeScheduleState,
        date: string,
        startTime: string,
    ): boolean {
        // Sprawdź odpoczynek od poprzedniej zmiany
        if (state.lastShiftDate && state.lastShiftEndTime) {
            const restHours = calculateRestHours(
                state.lastShiftDate,
                state.lastShiftEndTime,
                date,
                startTime,
            );
            if (
                restHours < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS &&
                restHours >= 0
            )
                return false;
        }

        // Sprawdź odpoczynek względem wszystkich zmian (na wypadek zmian w środku grafiku)
        // Dla custom shift (dodawanego później) musimy sprawdzić sąsiedztwo
        // Zakładamy że shiftManager trzyma posortowane zmiany? Niekoniecznie.
        for (const shift of state.shifts) {
            // Kolizja w ten sam dzień
            if (shift.date === date) return false;

            // Walidacja odpoczynku (11h)
            // Jeśli istnieje zmiana w dniu poprzednim
            const prevDay = new Date(date);
            prevDay.setDate(prevDay.getDate() - 1);
            const prevDayStr = prevDay.toISOString().split("T")[0];

            if (shift.date === prevDayStr) {
                const rest = calculateRestHours(
                    shift.date,
                    shift.end_time,
                    date,
                    startTime,
                );
                if (rest < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS) return false;
            }

            // Jeśli istnieje zmiana w dniu następnym
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split("T")[0];

            // Estymowany koniec dla nowej zmiany (przybliżenie dla walidacji)
            // Zakładamy max 12h pracy jeśli nie znamy dokładnego końca w tym miejscu checku
            // Ale w tryAddCustomShift znamy hoursNeeded, tutaj nie mamy tego parametru bezpośrenio w canAddCustomShift
            // Warto by przekazać endTime do canAddCustomShift dla dokładniejszej walidacji
            // Na razie uproszczenie:
            if (shift.date === nextDayStr) {
                // Sprawdzamy czy od END tej custom zmiany do START następnej jest 11h
                // Ale nie mamy tutaj endTime custom shifta. W funkcji tryAddCustomShift endTime jest wyliczane.
                // Powinniśmy przekazać endTime z tryAddCustomShift.
                // TODO: Refactor needed to pass endTime here.
            }
        }

        return true;
    }

    private canAddShift(
        state: EmployeeScheduleState,
        date: string,
        template: ShiftTemplate,
        context: SchedulerContext,
    ): boolean {
        const isWeekend = context.weekendDaysSet.has(date);
        return context.candidateFinder.canAddShift(
            state,
            date,
            template,
            isWeekend,
        );
    }
}
