/**
 * =============================================================================
 * WARSTWA 2: ILP OPTIMIZER (INTEGER LINEAR PROGRAMMING)
 * =============================================================================
 *
 * Matematyczna optymalizacja grafiku metodą programowania liniowego całkowitoliczbowego.
 *
 * Ze względu na brak biblioteki ILP w JS/TS, implementujemy uproszczoną wersję
 * opartą na metodzie "Local Search" z zachowaniem idei ILP:
 *
 * - Funkcja celu: minimalizacja nierównomierności godzin i weekendów
 * - Ograniczenia: hard constraints z Kodeksu Pracy
 * - Metoda: iteracyjne wymiany zmian między pracownikami
 *
 * W produkcyjnej wersji można zintegrować z:
 * - GLPK (GNU Linear Programming Kit) przez WebAssembly
 * - OR-Tools od Google
 * - CBC (COIN-OR Branch and Cut)
 */

import { logger } from "@/lib/utils/logger";
import { type SchedulerInput, type GeneratedShift } from "./types";
import { getShiftHours, getDayOfWeek } from "./scheduler-utils";
import { quickFitness } from "./evaluator";
import {
    canEmployeeWorkOnDate,
    checkHardConstraintsForShift,
} from "./validation";
import { getAdjustedRequiredHours } from "./scheduler-utils";
import { DAY_KEYS } from "@/lib/constants/days";

// =============================================================================
// KONFIGURACJA
// =============================================================================

export interface ILPConfig {
    /** Maksymalna liczba iteracji */
    maxIterations: number;
    /** Timeout w ms */
    timeoutMs: number;
    /** Czy logować postęp */
    verbose: boolean;
}

export const DEFAULT_ILP_CONFIG: ILPConfig = {
    maxIterations: 1000,
    timeoutMs: 5000,
    verbose: true,
};

// =============================================================================
// GŁÓWNA KLASA ILP OPTIMIZER
// =============================================================================

export class ILPOptimizer {
    private config: ILPConfig;
    private input: SchedulerInput;

    constructor(input: SchedulerInput, config: Partial<ILPConfig> = {}) {
        this.config = { ...DEFAULT_ILP_CONFIG, ...config };
        this.input = input;
    }

    /**
     * Optymalizuje grafik metodą Local Search (uproszczone ILP)
     */
    optimize(shifts: GeneratedShift[]): GeneratedShift[] {
        const startTime = Date.now();

        // ⚠️ GUARD: Jeśli nie ma zmian, zwróć pustą tablicę
        if (!shifts || shifts.length === 0) {
            if (this.config.verbose) {
                logger.warn("⚠️ ILP: Brak zmian do optymalizacji");
            }
            return [];
        }

        if (this.config.verbose) {
            logger.log("\n🔢 === ILP OPTIMIZER - START ===");
            logger.log(`Max iteracji: ${this.config.maxIterations}`);
            logger.log(`Timeout: ${this.config.timeoutMs}ms`);
        }

        let currentShifts = [...shifts];
        let currentFitness = quickFitness(currentShifts, this.input);
        let bestShifts = [...currentShifts];
        let bestFitness = currentFitness;

        if (this.config.verbose) {
            logger.log(`Initial fitness: ${currentFitness}`);
        }

        let iterationsWithoutImprovement = 0;
        const maxStagnation = 100;

        for (let iter = 0; iter < this.config.maxIterations; iter++) {
            // Check timeout
            if (Date.now() - startTime > this.config.timeoutMs) {
                if (this.config.verbose) {
                    logger.log(`⏱️ Timeout po ${iter} iteracjach`);
                }
                break;
            }

            // Choose random optimization operation
            const operation = Math.random();
            let newShifts: GeneratedShift[];

            if (operation < 0.4) {
                // Swap shifts between employees (load balancing)
                newShifts = this.trySwapShifts(currentShifts);
            } else if (operation < 0.7) {
                // Move shift to another day
                newShifts = this.tryMoveShift(currentShifts);
            } else {
                // Swap weekends
                newShifts = this.trySwapWeekends(currentShifts);
            }

            // Check for improvement
            const newFitness = quickFitness(newShifts, this.input);

            if (newFitness > currentFitness) {
                currentShifts = newShifts;
                currentFitness = newFitness;
                iterationsWithoutImprovement = 0;

                if (newFitness > bestFitness) {
                    bestShifts = [...newShifts];
                    bestFitness = newFitness;

                    if (this.config.verbose && iter % 50 === 0) {
                        logger.log(`Iter ${iter}: Fitness = ${bestFitness}`);
                    }
                }
            } else {
                iterationsWithoutImprovement++;
            }

            // Early stopping
            if (iterationsWithoutImprovement >= maxStagnation) {
                if (this.config.verbose) {
                    logger.log(`🛑 Stagnacja po ${iter} iteracjach`);
                }
                break;
            }
        }

        const elapsed = Date.now() - startTime;
        const improvement = bestFitness - quickFitness(shifts, this.input);

        if (this.config.verbose) {
            logger.log(`\n✅ ILP OPTYMALIZACJA ZAKOŃCZONA`);
            logger.log(`Czas: ${elapsed}ms`);
            logger.log(
                `Fitness: ${quickFitness(
                    shifts,
                    this.input,
                )} → ${bestFitness} (${
                    improvement > 0 ? "+" : ""
                }${improvement})`,
            );
            logger.log("🔢 === ILP OPTIMIZER - KONIEC ===\n");
        }

        return bestShifts;
    }

    // =========================================================================
    // OPERACJE OPTYMALIZACJI
    // =========================================================================

    /**
     * Próbuje wymienić zmiany między dwoma pracownikami (load balancing)
     */
    private trySwapShifts(shifts: GeneratedShift[]): GeneratedShift[] {
        const { employees, holidays, year, month, tradingSundays, settings } =
            this.input;
        const newShifts = [...shifts];

        // Pogrupuj zmiany per pracownik
        const shiftsByEmployee = new Map<string, number[]>();
        employees.forEach((emp) => shiftsByEmployee.set(emp.id, []));
        shifts.forEach((shift, idx) => {
            const empShifts = shiftsByEmployee.get(shift.employee_id);
            if (empShifts) empShifts.push(idx);
        });

        // Znajdź pracownika z nadmiarem i z niedoborem godzin
        // UWAGA: Używamy getAdjustedRequiredHours aby uwzględnić nieobecności!
        const employeeStats = employees.map((emp) => {
            const empShiftIndices = shiftsByEmployee.get(emp.id) || [];
            const totalHours = empShiftIndices.reduce(
                (sum, idx) => sum + getShiftHours(shifts[idx]),
                0,
            );
            // Używamy skorygowanych godzin uwzględniających nieobecności
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
            return {
                emp,
                indices: empShiftIndices,
                totalHours,
                requiredHours,
                diff: totalHours - requiredHours,
            };
        });

        // Znajdź parę do wymiany
        const overworked = employeeStats
            .filter((s) => s.diff > 2)
            .sort((a, b) => b.diff - a.diff);
        const underworked = employeeStats
            .filter((s) => s.diff < -2)
            .sort((a, b) => a.diff - b.diff);

        if (overworked.length === 0 || underworked.length === 0) {
            return shifts; // Nie ma co wymieniać
        }

        const giver = overworked[0];
        const receiver = underworked[0];

        // Znajdź zmianę do przekazania
        for (const shiftIdx of giver.indices) {
            const shift = newShifts[shiftIdx];

            // Sprawdź czy receiver może pracować w ten dzień
            if (
                !canEmployeeWorkOnDate(
                    receiver.emp,
                    shift.date,
                    this.input.holidays,
                )
            )
                continue;

            // Sprawdź czy receiver nie ma już zmiany w ten dzień
            const receiverDates = new Set(
                receiver.indices.map((idx) => newShifts[idx].date),
            );
            if (receiverDates.has(shift.date)) continue;

            // Sprawdź hard constraints dla receivera
            if (
                !checkHardConstraintsForShift(
                    receiver.emp.id,
                    shift.date,
                    shift,
                    newShifts,
                )
            )
                continue;

            // Wykonaj wymianę
            newShifts[shiftIdx] = {
                ...shift,
                employee_id: receiver.emp.id,
            };

            return newShifts;
        }

        return shifts;
    }

    /**
     * Próbuje przenieść zmianę na inny dzień (dla tego samego pracownika)
     */
    private tryMoveShift(shifts: GeneratedShift[]): GeneratedShift[] {
        const { workDays, saturdayDays, tradingSundays, employees } =
            this.input;
        const allDays = [...workDays, ...saturdayDays, ...tradingSundays];
        const newShifts = [...shifts];

        // Wybierz losową zmianę
        const shiftIdx = Math.floor(Math.random() * shifts.length);
        const shift = shifts[shiftIdx];

        // Znajdź dni gdzie pracownik nie ma jeszcze zmiany
        const employeeShiftDates = new Set(
            shifts
                .filter((s) => s.employee_id === shift.employee_id)
                .map((s) => s.date),
        );

        const freeDays = allDays.filter((day) => !employeeShiftDates.has(day));
        if (freeDays.length === 0) return shifts;

        // Wybierz losowy wolny dzień
        const newDate = freeDays[Math.floor(Math.random() * freeDays.length)];

        // Znajdź pracownika
        const emp = employees.find((e) => e.id === shift.employee_id);
        if (!emp) return shifts;

        // Sprawdź czy może pracować w nowy dzień
        if (!canEmployeeWorkOnDate(emp, newDate, this.input.holidays))
            return shifts;

        // ✅ Sprawdź czy szablon jest dostępny w nowy dzień (applicable_days)
        const template = this.input.templates.find(
            (t) => t.id === shift.template_id,
        );
        if (template?.applicable_days && template.applicable_days.length > 0) {
            const newDayKey = DAY_KEYS[getDayOfWeek(newDate)];
            if (!template.applicable_days.includes(newDayKey as never)) {
                return shifts; // Szablon nie jest dostępny w ten dzień
            }
        }

        // Sprawdź hard constraints
        const testShift = { ...shift, date: newDate };
        if (
            !checkHardConstraintsForShift(
                emp.id,
                newDate,
                testShift,
                newShifts.filter((_, i) => i !== shiftIdx),
            )
        ) {
            return shifts;
        }

        newShifts[shiftIdx] = testShift;
        return newShifts;
    }

    /**
     * Próbuje wymienić weekendy między pracownikami
     */
    private trySwapWeekends(shifts: GeneratedShift[]): GeneratedShift[] {
        const { employees, saturdayDays, tradingSundays } = this.input;
        const weekendDays = new Set([...saturdayDays, ...tradingSundays]);
        const newShifts = [...shifts];

        // Policz weekendy per pracownik
        const weekendCounts = new Map<string, number>();
        employees.forEach((emp) => weekendCounts.set(emp.id, 0));

        shifts.forEach((shift) => {
            if (weekendDays.has(shift.date)) {
                weekendCounts.set(
                    shift.employee_id,
                    (weekendCounts.get(shift.employee_id) || 0) + 1,
                );
            }
        });

        // Znajdź pracownika z najwięcej i najmniej weekendami
        const sorted = Array.from(weekendCounts.entries())
            .filter(([empId]) => {
                const emp = employees.find((e) => e.id === empId);
                return emp?.preferences?.can_work_weekends !== false;
            })
            .sort((a, b) => b[1] - a[1]);

        if (sorted.length < 2) return shifts;

        const [maxEmpId, maxCount] = sorted[0];
        const [minEmpId, minCount] = sorted[sorted.length - 1];

        if (maxCount - minCount <= 1) return shifts; // Już wyrównane

        // Znajdź weekendową zmianę do przekazania
        for (let i = 0; i < newShifts.length; i++) {
            const shift = newShifts[i];
            if (shift.employee_id !== maxEmpId || !weekendDays.has(shift.date))
                continue;

            const minEmp = employees.find((e) => e.id === minEmpId);
            if (!minEmp) continue;

            // Sprawdź czy minEmp może wziąć tę zmianę
            if (!canEmployeeWorkOnDate(minEmp, shift.date, this.input.holidays))
                continue;

            const minEmpDates = new Set(
                shifts
                    .filter((s) => s.employee_id === minEmpId)
                    .map((s) => s.date),
            );
            if (minEmpDates.has(shift.date)) continue;

            if (
                !checkHardConstraintsForShift(
                    minEmpId,
                    shift.date,
                    shift,
                    newShifts,
                )
            )
                continue;

            // Wykonaj wymianę
            newShifts[i] = { ...shift, employee_id: minEmpId };
            return newShifts;
        }

        return shifts;
    }
}
