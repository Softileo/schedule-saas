/**
 * =============================================================================
 * GREEDY SCHEDULER - REFACTORED
 * =============================================================================
 *
 * Modułowa implementacja harmonogramu zachłannego.
 * Podział na kroki (Steps) i współdzielony kontekst (SchedulerContext).
 */

import { logger } from "@/lib/utils/logger";
import {
    type SchedulerInput,
    type GeneratedShift,
    type EmployeeScheduleState,
} from "../types";
import { getDayOfWeek } from "../scheduler-utils";
import { type SchedulerContext } from "./scheduler-context";
import { ShiftManager } from "./shift-manager";
import { CandidateScorer } from "./scoring-engine";
import { CandidateFinder } from "./candidate-finder";

// Import steps
import { InitialStaffingStep } from "./steps/step-1-initial-staffing";
import { FillHoursStep } from "./steps/step-2-fill-hours";
import { OptimizationStep } from "./steps/step-3-optimization";
import { EmergencyStaffingStep as EmergencyStep } from "./steps/step-4-emergency";
import { NormalizationStep } from "./steps/step-5-normalization";
import { BalancingStep } from "./steps/step-6-balancing";

// Utils
import { getRequiredHours } from "@/lib/core/schedule/work-hours";
import { getEmploymentTypeHoursPerDay } from "@/lib/constants/employment";
import { timeToMinutes } from "@/lib/utils/date-helpers";
import { DAY_KEYS } from "@/lib/constants/days";
import type { ShiftTemplate, OpeningHours } from "@/types";
import { getAvailableTemplatesForEmployee } from "../scheduler-utils";

export class GreedyScheduler {
    constructor(private input: SchedulerInput) {}

    generate(): GeneratedShift[] {
        logger.log(
            "\n========== GREEDY SCHEDULER - START (REFACTORED) ==========",
        );
        logger.log(`Miesiąc: ${this.input.month}/${this.input.year}`);
        logger.log(`Pracowników: ${this.input.employees.length}`);
        logger.log(`Szablonów: ${this.input.templates.length}`);

        // 1. Inicjalizacja Kontekstu
        const context = this.initializeContext();
        logger.log(`Dni roboczych: ${context.allWorkingDays.length}`);

        // 2. Inicjalizacja Kroków
        const step1 = new InitialStaffingStep();
        const step2 = new FillHoursStep();
        const step3 = new OptimizationStep();
        const step4 = new EmergencyStep();
        const step5 = new NormalizationStep();
        const step6 = new BalancingStep();

        // 3. Wykonanie Algorytmu
        // Krok 1: Wstępna obsada (minimalna)
        step1.staffAllDays(context);

        // Krok 2: Uzupełnianie godzin do etatu
        step2.fillMissingHours(context);

        // Krok 3: Optymalizacja (zamiana zmian, poprawa balansu)
        step3.execute(context);

        // Krok 4: Awaryjne łatanie dziur
        step4.emergencyStaffing(context);

        // Krok 5: Normalizacja (wyrównywanie liczby osób między dniami)
        step5.normalizeStaffing(context);

        // Krok 6: Balansowanie szablonów wewnątrz dnia
        step6.balanceTemplatesPerDay(context);

        // 4. Zebranie wyników
        const allShifts: GeneratedShift[] = [];
        context.employeeStates.forEach((state) => {
            allShifts.push(...state.shifts);
        });

        allShifts.sort((a, b) => a.date.localeCompare(b.date));

        this.logSummary(context, allShifts);

        return allShifts;
    }

    private initializeContext(): SchedulerContext {
        const {
            year,
            month,
            employees,
            templates,
            holidays,
            settings,
            templateAssignmentsMap,
        } = this.input;

        // --- Data Prep ---
        // Oblicz zakres dat dla bieżącego miesiąca
        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
            lastDay,
        ).padStart(2, "0")}`;

        const holidayDates = new Set(holidays.map((h) => h.date));

        const tradingSundaysSet = new Set(this.input.tradingSundays);
        const saturdaysSet = new Set(this.input.saturdayDays);

        const allWorkingDays = [
            ...this.input.workDays,
            ...this.input.saturdayDays,
            ...this.input.tradingSundays,
        ].sort();

        const weekendDaysSet = new Set([
            ...this.input.saturdayDays,
            ...this.input.tradingSundays,
        ]);

        // --- Structures ---
        const employeeStates = new Map<string, EmployeeScheduleState>();
        const dailyStaffing = new Map<string, GeneratedShift[]>();
        const dailyTemplateStaffing = new Map<
            string,
            Map<string, GeneratedShift[]>
        >();

        // --- Initialize Employees ---
        for (const emp of employees) {
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

            // Policz dni robocze nieobecności i pomniejsz wymagane godziny
            if (emp.absences && emp.absences.length > 0) {
                let absenceDays = 0;

                for (const absence of emp.absences) {
                    if (absence.is_paid === false) continue;

                    // Zakres
                    if (
                        absence.start_date > monthEnd ||
                        absence.end_date < monthStart
                    )
                        continue;

                    const absStart =
                        absence.start_date < monthStart
                            ? monthStart
                            : absence.start_date;
                    const absEnd =
                        absence.end_date > monthEnd
                            ? monthEnd
                            : absence.end_date;

                    const startDate = new Date(absStart);
                    const endDate = new Date(absEnd);

                    for (
                        let d = new Date(startDate);
                        d <= endDate;
                        d.setDate(d.getDate() + 1)
                    ) {
                        const dateStr = `${d.getFullYear()}-${String(
                            d.getMonth() + 1,
                        ).padStart(2, "0")}-${String(d.getDate()).padStart(
                            2,
                            "0",
                        )}`;

                        if (holidayDates.has(dateStr)) continue;
                        if (d.getDay() === 0 && !tradingSundaysSet.has(dateStr))
                            continue;

                        const openingHours = settings.opening_hours as
                            | Record<string, { enabled?: boolean }>
                            | undefined;
                        if (
                            d.getDay() === 6 &&
                            openingHours?.saturday?.enabled === false
                        )
                            continue;

                        absenceDays += 1;
                    }
                }

                if (absenceDays > 0) {
                    const reduction = absenceDays * hoursPerDay;
                    logger.log(
                        `🚫 ${emp.first_name}: ${absenceDays} dni nieobecności, -${reduction}h`,
                    );
                    requiredHours = Math.max(0, requiredHours - reduction);
                }
            }

            const availableTemplates = getAvailableTemplatesForEmployee(
                emp,
                templates,
                templateAssignmentsMap,
            );

            // Zbierz dni nieobecności do occupiedDates
            const absenceDatesSet = new Set<string>();
            if (emp.absences && emp.absences.length > 0) {
                for (const absence of emp.absences) {
                    // Zakres
                    if (
                        absence.start_date > monthEnd ||
                        absence.end_date < monthStart
                    )
                        continue;

                    const absStart =
                        absence.start_date < monthStart
                            ? monthStart
                            : absence.start_date;
                    const absEnd =
                        absence.end_date > monthEnd
                            ? monthEnd
                            : absence.end_date;

                    const startDate = new Date(absStart);
                    const endDate = new Date(absEnd);

                    for (
                        let d = new Date(startDate);
                        d <= endDate;
                        d.setDate(d.getDate() + 1)
                    ) {
                        const dateStr = `${d.getFullYear()}-${String(
                            d.getMonth() + 1,
                        ).padStart(2, "0")}-${String(d.getDate()).padStart(
                            2,
                            "0",
                        )}`;
                        absenceDatesSet.add(dateStr);
                    }
                }

                if (absenceDatesSet.size > 0) {
                    logger.log(
                        `📅 ${emp.first_name}: zablokowano ${absenceDatesSet.size} dni nieobecności`,
                    );
                }
            }

            // Pobierz dane historyczne
            const quarterlyShiftCount =
                this.input.quarterlyHistory?.shiftsPerEmployee.get(emp.id) || 0;
            const quarterlyHours =
                this.input.quarterlyHistory?.hoursPerEmployee.get(emp.id) || 0;
            const quarterlyShiftTypes =
                this.input.quarterlyHistory?.shiftTypeDistribution.get(
                    emp.id,
                ) || {
                    morning: 0,
                    afternoon: 0,
                    evening: 0,
                };

            employeeStates.set(emp.id, {
                emp,
                requiredHours,
                currentHours: 0,
                shifts: [],
                weekendShiftCount: 0,
                saturdayShiftCount: 0,
                sundayShiftCount: 0,
                morningShiftCount: 0,
                afternoonShiftCount: 0,
                eveningShiftCount: 0,
                availableTemplates,
                occupiedDates: absenceDatesSet, // Zainicjuj z dniami nieobecności
                lastShiftType: null,
                consecutiveShiftDays: 0,
                lastShiftTemplate: null,
                lastShiftDate: null,
                lastShiftEndTime: null,
                consecutiveWorkDays: 0,
                quarterlyShiftCount,
                quarterlyHours,
                quarterlyShiftTypes,
            });
        }

        // --- Initialize Daily Maps ---
        for (const day of allWorkingDays) {
            dailyStaffing.set(day, []);
            const templateMap = new Map<string, GeneratedShift[]>();

            const isTradingSunday = tradingSundaysSet.has(day);
            const dayTemplates = this.getTemplatesForDay(
                templates,
                day,
                settings.opening_hours as unknown as OpeningHours | null,
                isTradingSunday,
            );

            for (const t of dayTemplates) {
                templateMap.set(t.id, []);
            }
            dailyTemplateStaffing.set(day, templateMap);
        }

        // --- Initialize Managers ---
        // Creating context incrementally to resolve dependency loop
        const shiftManager = new ShiftManager(
            employeeStates,
            dailyStaffing,
            dailyTemplateStaffing,
            weekendDaysSet,
            saturdaysSet,
            tradingSundaysSet,
        );

        const scorer = new CandidateScorer();

        // Temporary object to satisfy CandidateFinder constructor
        const tempContext = {
            input: this.input,
            employeeStates,
            dailyStaffing,
            dailyTemplateStaffing,
            allWorkingDays,
            weekendDaysSet,
            tradingSundaysSet,
            saturdaysSet,
            shiftManager: shiftManager!,
            scorer: scorer!,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            candidateFinder: null as any,
        };

        const candidateFinder = new CandidateFinder(tempContext);

        // Final object
        return {
            ...tempContext,
            candidateFinder,
        };
    }

    private getTemplatesForDay(
        templates: ShiftTemplate[],
        date: string,
        openingHours: OpeningHours | null,
        isTradingSunday: boolean,
    ): ShiftTemplate[] {
        const dayOfWeek = getDayOfWeek(date);
        const dayKey = DAY_KEYS[dayOfWeek]; // "sunday", "monday", etc.

        // 1. Filtrowanie wstępne po "applicable_days" zdefiniowanych w szablonie
        const templatesForDay = templates.filter((t) => {
            if (!t.applicable_days || t.applicable_days.length === 0)
                return true; // Domyślnie dostępny wszędzie
            return t.applicable_days.includes(dayKey as never);
        });

        // 2. Jeśli brak definicji godzin otwarcia - ufamy szablonom
        if (!openingHours) return templatesForDay;

        const dayHours = openingHours[dayKey];

        // 3. Logika nadrzędności Szablonu nad Godzinami Otwarcia
        return templatesForDay.filter((t) => {
            // A. Jeśli to Niedziela Handlowa i szablon jest na niedzielę -> ZAWSZE OK
            if (isTradingSunday && dayKey === "sunday") return true;

            // B. Priorytet Konfiguracji Szablonu:
            // Jeśli szablon ma EXPLICITE zaznaczony ten dzień w "applicable_days",
            // to uznajemy, że user chce go użyć NAWET JEŚLI:
            // - Dzień jest "zamknięty" w gloablnych Opening Hours
            // - Godziny szablonu wykraczają poza globalne Opening Hours
            if (
                t.applicable_days &&
                t.applicable_days.includes(dayKey as never)
            ) {
                return true;
            }

            // C. Dla szablonów "ogólnych" (bez applicable_days) stosujemy restrykcje Opening Hours
            if (!dayHours || !dayHours.enabled) return false;

            if (!dayHours.open || !dayHours.close) return true;

            const tStart = timeToMinutes(t.start_time);
            const tEnd = timeToMinutes(t.end_time);
            const open = timeToMinutes(dayHours.open);
            const close = timeToMinutes(dayHours.close);

            const tolerance = 30; // 30 min tolerancji dla ogólnych szablonów
            const isNightShift = tStart < 6 * 60;

            if (isNightShift) return true;
            return tStart >= open - tolerance && tEnd <= close + tolerance;
        });
    }

    private logSummary(
        context: SchedulerContext,
        allShifts: GeneratedShift[],
    ): void {
        logger.log("\n========== GREEDY SCHEDULER - WYNIKI ==========");
        logger.log(`Wygenerowano łącznie zmian: ${allShifts.length}`);

        let satisfied = 0;
        let deficit = 0;

        context.employeeStates.forEach((state) => {
            const perc = (state.currentHours / state.requiredHours) * 100;
            const diff = state.currentHours - state.requiredHours;
            const sign = diff > 0 ? "+" : "";

            logger.log(
                `${state.emp.first_name}: ${state.currentHours}h / ${
                    state.requiredHours
                }h (${perc.toFixed(0)}%) [${sign}${diff}h]`,
            );

            if (state.currentHours >= state.requiredHours - 2) satisfied++;
            else deficit++;
        });

        logger.log(`\nZadowoleni z godzin: ${satisfied}`);
        logger.log(`Znaczący deficyt: ${deficit}`);
    }
}
