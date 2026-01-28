import { logger } from "@/lib/utils/logger";
import { type SchedulerContext } from "../scheduler-context";
import { type EmployeeScheduleState } from "../../types";
import {
    getTemplateHours,
    getShiftHours,
    getDayOfWeek,
    getShiftTimeType,
} from "../../scheduler-utils";
import type { ShiftTemplate } from "@/types";
import type { GeneratedShift } from "../../types";
import {
    calculateHoursDeficit,
    calculateHoursSurplus,
} from "../../greedy/helpers";
import {
    SIGNIFICANT_HOURS_DEFICIT,
    EMERGENCY_STAFFING_ATTEMPTS,
} from "../../greedy/config";
import { DAY_KEYS } from "@/lib/constants/days";

export class OptimizationStep {
    execute(context: SchedulerContext): void {
        this.optimizeHours(context);
        this.optimizeSurplus(context); // NEW: Redukcja nadgodzin
        this.optimizePreferences(context);
        this.optimizeShiftTypes(context); // NEW: Wyrównywanie typów zmian
    }

    private optimizeHours(context: SchedulerContext): void {
        logger.log("\n--- KROK 3a: Optymalizacja godzin (Deficyty) ---");
        const { templates } = context.input;
        const { employeeStates } = context;

        let swapsPerformed = 0;
        let shiftsAdded = 0;

        const sortedTemplates = [...templates].sort(
            (a, b) => getTemplateHours(a) - getTemplateHours(b),
        );

        for (const state of employeeStates.values()) {
            const deficit = calculateHoursDeficit(state);
            if (deficit <= SIGNIFICANT_HOURS_DEFICIT) continue;

            logger.log(
                `🔧 ${state.emp.first_name}: deficyt ${deficit.toFixed(
                    1,
                )}h, próbuję optymalizować...`,
            );

            for (
                let attempt = 0;
                attempt < EMERGENCY_STAFFING_ATTEMPTS;
                attempt++
            ) {
                const currentDeficit = calculateHoursDeficit(state);
                if (currentDeficit <= SIGNIFICANT_HOURS_DEFICIT) break;

                const optimized = this.tryOptimizeEmployeeHours(
                    state,
                    sortedTemplates,
                    context,
                );

                if (optimized.swapped) swapsPerformed++;
                if (optimized.added) shiftsAdded++;

                if (!optimized.swapped && !optimized.added) break;
            }
        }

        logger.log(
            `Optymalizacja godzin: ${swapsPerformed} zamian, ${shiftsAdded} dodatkowych zmian`,
        );
    }

    private optimizeSurplus(context: SchedulerContext): void {
        logger.log("\n--- KROK 3c: Redukcja nadgodzin (Transfer) ---");

        let transferred = 0;
        const { employeeStates, input } = context;

        // Znajdź pracowników z nadgodzinami (> 1h)
        const overworked = Array.from(employeeStates.values())
            .filter((state) => calculateHoursSurplus(state) > 1)
            .sort(
                (a, b) => calculateHoursSurplus(b) - calculateHoursSurplus(a),
            );

        for (const state of overworked) {
            let surplus = calculateHoursSurplus(state);
            if (surplus <= 1) continue;

            const shifts = [...state.shifts].sort(
                (a, b) => getShiftHours(a) - getShiftHours(b),
            );

            for (const shift of shifts) {
                if (surplus <= 1) break;

                const template = input.templates.find(
                    (t) => t.id === shift.template_id,
                );
                if (!template) continue;

                const shiftHours = getShiftHours(shift);

                // Próbuj znaleźć kogoś z deficytem
                const candidate = this.findTransferCandidate(
                    shift,
                    template,
                    context,
                );

                if (candidate) {
                    context.shiftManager.removeShift(state.emp.id, shift);
                    context.shiftManager.addShift(
                        candidate.emp.id,
                        shift.date,
                        template,
                    );

                    surplus -= shiftHours;
                    transferred++;
                    logger.log(
                        `  Transfer nadgodzin: ${state.emp.first_name} -> ${candidate.emp.first_name} [${shift.date}, ${shiftHours}h]`,
                    );
                }
            }
        }
        logger.log(`Redukcja nadgodzin: ${transferred} transferów.`);
    }

    private findTransferCandidate(
        shift: GeneratedShift,
        template: ShiftTemplate,
        context: SchedulerContext,
    ): EmployeeScheduleState | null {
        const candidates = Array.from(context.employeeStates.values())
            .filter((state) => state.emp.id !== shift.employee_id)
            .filter((state) => calculateHoursDeficit(state) > 1) // Musi potrzebować godzin
            .sort(
                (a, b) => calculateHoursDeficit(b) - calculateHoursDeficit(a),
            );

        for (const cand of candidates) {
            const isWeekend = context.weekendDaysSet.has(shift.date);
            if (
                context.candidateFinder.canAddShift(
                    cand,
                    shift.date,
                    template,
                    isWeekend,
                )
            ) {
                // Upewnij się że transfer nie spowoduje u niego nadgodzin
                const hours = getTemplateHours(template);
                if (cand.currentHours + hours <= cand.requiredHours + 2) {
                    return cand;
                }
            }
        }
        return null;
    }

    private optimizePreferences(context: SchedulerContext): void {
        logger.log("\n--- KROK 3b: Optymalizacja preferencji ---");

        let optimizations = 0;

        for (const state of context.employeeStates.values()) {
            const preferredDays = state.emp.preferences?.preferred_days;
            if (!preferredDays || preferredDays.length === 0) continue;

            // Znajdź zmiany w dni niepreferowane
            const shiftsToMove = state.shifts.filter((shift) => {
                const dayOfWeek = getDayOfWeek(shift.date);
                return !preferredDays.includes(dayOfWeek);
            });

            if (shiftsToMove.length === 0) continue;

            for (const shift of shiftsToMove) {
                // Próbuj przenieść na dzień preferowany
                for (const day of context.allWorkingDays) {
                    const dayOfWeek = getDayOfWeek(day);
                    if (!preferredDays.includes(dayOfWeek)) continue;
                    if (state.occupiedDates.has(day)) continue;

                    const template = context.input.templates.find(
                        (t) => t.id === shift.template_id,
                    );
                    if (!template) continue;

                    const isWeekend = context.weekendDaysSet.has(day);

                    // --- CONSTRAINT CHECKS ---
                    // 1. Check if removing from old date breaks MIN constraint
                    if (
                        shift.template_id &&
                        !this.checkMinConstraint(
                            shift.date,
                            shift.template_id,
                            context,
                        )
                    )
                        continue;

                    // 2. Check if adding to new date breaks MAX constraint
                    if (!this.checkMaxConstraint(day, template.id, context))
                        continue;

                    // Symulacja przeniesienia
                    context.shiftManager.removeShift(state.emp.id, shift);

                    if (
                        context.candidateFinder.canAddShift(
                            state,
                            day,
                            template,
                            isWeekend,
                        )
                    ) {
                        context.shiftManager.addShift(
                            state.emp.id,
                            day,
                            template,
                        );
                        logger.log(
                            `✨ Przeniesiono zmianę ${state.emp.first_name}: ${shift.date} -> ${day} (Preferowany)`,
                        );
                        optimizations++;
                        break;
                    } else {
                        // Cofnij zmiany
                        context.shiftManager.addShift(
                            state.emp.id,
                            shift.date,
                            template,
                        );
                    }
                }
            }
        }

        logger.log(
            `Optymalizacja preferencji: ${optimizations} poprawionych zmian`,
        );
    }

    private tryOptimizeEmployeeHours(
        state: EmployeeScheduleState,
        sortedTemplates: ShiftTemplate[],
        context: SchedulerContext,
    ): { swapped: boolean; added: boolean } {
        const deficit = state.requiredHours - state.currentHours;

        // 1. Try adding directly
        for (const template of sortedTemplates) {
            const templateHours = getTemplateHours(template);
            if (templateHours <= deficit + 0.5) {
                const dayAdded = this.tryAddShiftForOptimization(
                    state,
                    template,
                    context,
                );
                if (dayAdded) {
                    logger.log(
                        `  + Dodano ${template.start_time.slice(
                            0,
                            5,
                        )}-${template.end_time.slice(
                            0,
                            5,
                        )} (${templateHours}h) w ${dayAdded}`,
                    );
                    return { swapped: false, added: true };
                }
            }
        }

        // 2. Try swap to longer shift
        // Sort shifts by hours ASCENDING (replace shortest first) to maximize gain
        // Reverting to ASC sort for efficiency in finding upgrade candidates
        const shiftsToCheck = [...state.shifts].sort((a, b) => {
            const hoursA = getShiftHours(a);
            const hoursB = getShiftHours(b);
            return hoursA - hoursB;
        });

        for (const currentShift of shiftsToCheck) {
            const currentHours = getShiftHours(currentShift);

            for (const longerTemplate of sortedTemplates) {
                const longerHours = getTemplateHours(longerTemplate);

                // Szukamy zmiany dłuższej o min 1h
                if (longerHours <= currentHours + 1.0) continue;

                // Sprawdź czy pracownik ma ten szablon
                if (
                    !state.availableTemplates.some(
                        (t) => t.id === longerTemplate.id,
                    )
                )
                    continue;

                // --- NEW: Check Applicable Days for the longer template ---
                // Must ensure the longer template is actually valid on this specific day!
                if (
                    longerTemplate.applicable_days &&
                    longerTemplate.applicable_days.length > 0
                ) {
                    const dayKey = DAY_KEYS[getDayOfWeek(currentShift.date)];
                    if (
                        !longerTemplate.applicable_days.includes(
                            dayKey as never,
                        )
                    ) {
                        continue;
                    }
                }

                // Sprawdź czy to zbyt duża nadgodzina
                const hoursDiff = longerHours - currentHours;
                // Jeśli po zmianie przekroczymy etat zbytnio (np. +8h), to bez sensu
                // Ale FillHoursStep powinno było zadbać o podstawy. Tutaj walczymy o deficit.
                if (state.currentHours + hoursDiff > state.requiredHours + 8)
                    continue;

                const isWeekend = context.weekendDaysSet.has(currentShift.date);

                // --- CONSTRAINT CHECKS ---
                // 1. Removing currentShift: check MIN
                if (
                    currentShift.template_id &&
                    !this.checkMinConstraint(
                        currentShift.date,
                        currentShift.template_id,
                        context,
                    )
                )
                    continue;

                // 2. Adding longerTemplate: check MAX
                if (
                    !this.checkMaxConstraint(
                        currentShift.date,
                        longerTemplate.id,
                        context,
                    )
                )
                    continue;

                context.shiftManager.removeShift(state.emp.id, currentShift);

                if (
                    context.candidateFinder.canAddShift(
                        state,
                        currentShift.date,
                        longerTemplate,
                        isWeekend,
                    )
                ) {
                    context.shiftManager.addShift(
                        state.emp.id,
                        currentShift.date,
                        longerTemplate,
                    );
                    logger.log(
                        `  Swap: ${currentHours}h -> ${longerHours}h, deficyt zmniejszony`,
                    );
                    return { swapped: true, added: false };
                } else {
                    const originalTemplate = context.input.templates.find(
                        (t) => t.id === currentShift.template_id,
                    );
                    if (originalTemplate) {
                        context.shiftManager.addShift(
                            state.emp.id,
                            currentShift.date,
                            originalTemplate,
                        );
                    }
                }
            }
        }

        return { swapped: false, added: false };
    }

    private tryAddShiftForOptimization(
        state: EmployeeScheduleState,
        template: ShiftTemplate,
        context: SchedulerContext,
    ): string | null {
        // Sort days by staffing level (ascending) to prefer understaffed days
        // This prevents piling everyone onto the first valid day
        const sortedDays = [...context.allWorkingDays].sort((a, b) => {
            const staffingA = context.dailyStaffing.get(a)?.length || 0;
            const staffingB = context.dailyStaffing.get(b)?.length || 0;
            return staffingA - staffingB;
        });

        for (const day of sortedDays) {
            if (state.occupiedDates.has(day)) continue;

            const isWeekend = context.weekendDaysSet.has(day);

            if (
                template.applicable_days &&
                template.applicable_days.length > 0
            ) {
                const dayKey = DAY_KEYS[getDayOfWeek(day)];
                if (!template.applicable_days.includes(dayKey as never))
                    continue;
            }

            // Check MAX constraint before adding
            if (!this.checkMaxConstraint(day, template.id, context)) continue;

            if (
                context.candidateFinder.canAddShift(
                    state,
                    day,
                    template,
                    isWeekend,
                )
            ) {
                context.shiftManager.addShift(state.emp.id, day, template);
                return day;
            }
        }
        return null;
    }

    private optimizeShiftTypes(context: SchedulerContext): void {
        logger.log("\n--- KROK 3d: Optymalizacja typów zmian (Równowaga) ---");

        let swaps = 0;

        // Iterate through all days to find swap opportunities
        for (const day of context.allWorkingDays) {
            const dailyShifts = context.dailyStaffing.get(day);
            if (!dailyShifts || dailyShifts.length < 2) continue;

            let swappedToday = false;

            // Try to find a swap
            for (let i = 0; i < dailyShifts.length; i++) {
                if (swappedToday) break; // One swap per day per pass
                const s1 = dailyShifts[i];

                for (let j = i + 1; j < dailyShifts.length; j++) {
                    const s2 = dailyShifts[j];

                    if (s1.employee_id === s2.employee_id) continue;
                    if (s1.template_id === s2.template_id) continue;

                    const t1 = context.input.templates.find(
                        (t) => t.id === s1.template_id,
                    );
                    const t2 = context.input.templates.find(
                        (t) => t.id === s2.template_id,
                    );
                    if (!t1 || !t2) continue;

                    // Only swap if types are different
                    const type1 = getShiftTimeType(t1.start_time, t1.name);
                    const type2 = getShiftTimeType(t2.start_time, t2.name);
                    if (type1 === type2) continue;

                    const emp1 = context.employeeStates.get(s1.employee_id);
                    const emp2 = context.employeeStates.get(s2.employee_id);
                    if (!emp1 || !emp2) continue;

                    // Check if swap improves balance
                    const currentScore =
                        this.calculateBalanceScore(emp1) +
                        this.calculateBalanceScore(emp2);

                    const emp1Sim = this.simulateBalanceScore(
                        emp1,
                        type1,
                        type2,
                    );
                    const emp2Sim = this.simulateBalanceScore(
                        emp2,
                        type2,
                        type1,
                    );

                    const newScore = emp1Sim + emp2Sim;

                    // Threshold: improvement > 0.5 (substantial)
                    if (currentScore - newScore > 0.5) {
                        // Check VALIDITY
                        context.shiftManager.removeShift(emp1.emp.id, s1);
                        context.shiftManager.removeShift(emp2.emp.id, s2);

                        const can1 = context.candidateFinder.canAddShift(
                            emp1,
                            day,
                            t2,
                            context.weekendDaysSet.has(day),
                        );
                        const can2 = context.candidateFinder.canAddShift(
                            emp2,
                            day,
                            t1,
                            context.weekendDaysSet.has(day),
                        );

                        if (can1 && can2) {
                            context.shiftManager.addShift(emp1.emp.id, day, t2);
                            context.shiftManager.addShift(emp2.emp.id, day, t1);
                            swaps++;
                            swappedToday = true;
                            logger.log(
                                `  ⚖️ Swap typów ${day}: ${emp1.emp.first_name} (${type1}->${type2}) <-> ${emp2.emp.first_name} (${type2}->${type1})`,
                            );
                            break;
                        } else {
                            // Revert
                            context.shiftManager.addShift(
                                emp1.emp.id,
                                s1.date,
                                t1,
                            );
                            context.shiftManager.addShift(
                                emp2.emp.id,
                                s2.date,
                                t2,
                            );
                        }
                    }
                }
            }
        }
        logger.log(
            `Optymalizacja typów: ${swaps} zamian poprawiających balans.`,
        );
    }

    private calculateBalanceScore(state: EmployeeScheduleState): number {
        const total = state.shifts.length;
        if (total === 0) return 0;

        const m = state.morningShiftCount;
        const a = state.afternoonShiftCount;
        const e = state.eveningShiftCount;
        const target = total / 3;

        return (
            Math.pow(m - target, 2) +
            Math.pow(a - target, 2) +
            Math.pow(e - target, 2)
        );
    }

    private simulateBalanceScore(
        state: EmployeeScheduleState,
        removeType: string,
        addType: string,
    ): number {
        const total = state.shifts.length;
        if (total === 0) return 0;

        let m = state.morningShiftCount;
        let a = state.afternoonShiftCount;
        let e = state.eveningShiftCount;

        if (removeType === "morning") m--;
        else if (removeType === "afternoon") a--;
        else if (removeType === "evening") e--;

        if (addType === "morning") m++;
        else if (addType === "afternoon") a++;
        else if (addType === "evening") e++;

        const target = total / 3;
        return (
            Math.pow(m - target, 2) +
            Math.pow(a - target, 2) +
            Math.pow(e - target, 2)
        );
    }

    private checkMinConstraint(
        day: string,
        templateId: string,
        context: SchedulerContext,
    ): boolean {
        const template = context.input.templates.find(
            (t) => t.id === templateId,
        );
        const minEmployees =
            template?.min_employees ??
            context.input.settings.min_employees_per_shift ??
            1;

        const currentCount =
            context.dailyTemplateStaffing.get(day)?.get(templateId)?.length ||
            0;
        // Allows removal only if we are currently above the minimum
        return currentCount > minEmployees;
    }

    private checkMaxConstraint(
        day: string,
        templateId: string,
        context: SchedulerContext,
    ): boolean {
        const template = context.input.templates.find(
            (t) => t.id === templateId,
        );
        if (
            !template ||
            template.max_employees === null ||
            template.max_employees === undefined
        )
            return true;

        const currentCount =
            context.dailyTemplateStaffing.get(day)?.get(templateId)?.length ||
            0;
        return currentCount < template.max_employees;
    }
}
