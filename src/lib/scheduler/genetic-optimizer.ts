/**
 * =============================================================================
 * WARSTWA 3: GENETIC OPTIMIZER (ALGORYTM GENETYCZNY)
 * =============================================================================
 *
 * Finalne doszlifowanie grafiku metodą ewolucyjną.
 * Optymalizuje soft constraints: preferencje, bloki zmian, komfort pracowników.
 *
 * Operatory genetyczne:
 * - Selekcja turniejowa
 * - Krzyżowanie jednopunktowe
 * - Mutacje: swap, move, change template
 */

import {
    type SchedulerInput,
    type GeneratedShift,
    type EmployeeWithData,
} from "./types";
import { getDayOfWeek } from "./scheduler-utils";
import { logger } from "@/lib/utils/logger";
import { quickFitness } from "./evaluator";
import { checkHardConstraintsForShift } from "./validation";
import { getAvailableTemplatesForEmployee } from "./scheduler-utils";
import { DAY_KEYS } from "@/lib/constants/days";

// =============================================================================
// KONFIGURACJA
// =============================================================================

export interface GeneticConfig {
    populationSize: number;
    generations: number;
    mutationRate: number;
    crossoverRate: number;
    eliteCount: number;
    tournamentSize: number;
    timeoutMs: number;
}

export const DEFAULT_GENETIC_CONFIG: GeneticConfig = {
    populationSize: 30,
    generations: 100,
    mutationRate: 0.2,
    crossoverRate: 0.7,
    eliteCount: 2,
    tournamentSize: 3,
    timeoutMs: 5000,
};

export const FAST_GENETIC_CONFIG: GeneticConfig = {
    populationSize: 15,
    generations: 30,
    mutationRate: 0.25,
    crossoverRate: 0.6,
    eliteCount: 1,
    tournamentSize: 2,
    timeoutMs: 2000,
};

// =============================================================================
// TYPY
// =============================================================================

interface Individual {
    shifts: GeneratedShift[];
    fitness: number;
}

// =============================================================================
// GŁÓWNA KLASA
// =============================================================================

export class GeneticOptimizer {
    private config: GeneticConfig;
    private input: SchedulerInput;
    private allWorkingDays: string[];
    private weekendDays: Set<string>;

    constructor(input: SchedulerInput, config: Partial<GeneticConfig> = {}) {
        this.config = { ...DEFAULT_GENETIC_CONFIG, ...config };
        this.input = input;

        this.allWorkingDays = [
            ...input.workDays,
            ...input.saturdayDays,
            ...input.tradingSundays,
        ].sort();

        this.weekendDays = new Set([
            ...input.saturdayDays,
            ...input.tradingSundays,
        ]);
    }

    /**
     * Optymalizuje grafik algorytmem genetycznym
     */
    optimize(shifts: GeneratedShift[]): GeneratedShift[] {
        const startTime = Date.now();

        logger.log("\n🧬 === GENETIC OPTIMIZER - START ===");
        logger.log(
            `Populacja: ${this.config.populationSize}, Generacje: ${this.config.generations}`,
        );

        const initialFitness = quickFitness(shifts, this.input);
        logger.log(`Fitness początkowy: ${initialFitness}`);

        // Inicjalizuj populację
        let population = this.initializePopulation(shifts);

        let bestIndividual = population[0];
        let generationsWithoutImprovement = 0;

        // Główna pętla ewolucji
        for (let gen = 0; gen < this.config.generations; gen++) {
            // Timeout
            if (Date.now() - startTime > this.config.timeoutMs) {
                logger.log(`⏱️ Timeout po ${gen} generacjach`);
                break;
            }

            // Sortuj po fitness
            population.sort((a, b) => b.fitness - a.fitness);

            // Nowa generacja
            const newPopulation: Individual[] = [];

            // Elitaryzm
            for (let i = 0; i < this.config.eliteCount; i++) {
                newPopulation.push(this.clone(population[i]));
            }

            // Generuj potomków
            while (newPopulation.length < this.config.populationSize) {
                const parent1 = this.tournamentSelect(population);
                const parent2 = this.tournamentSelect(population);

                let child: Individual;
                if (Math.random() < this.config.crossoverRate) {
                    child = this.crossover(parent1, parent2);
                } else {
                    child = this.clone(parent1);
                }

                if (Math.random() < this.config.mutationRate) {
                    this.mutate(child);
                }

                child.fitness = quickFitness(child.shifts, this.input);
                newPopulation.push(child);
            }

            population = newPopulation;

            // Sprawdź najlepszego
            const currentBest = population.reduce((a, b) =>
                a.fitness > b.fitness ? a : b,
            );

            if (currentBest.fitness > bestIndividual.fitness) {
                bestIndividual = currentBest;
                generationsWithoutImprovement = 0;
            } else {
                generationsWithoutImprovement++;
            }

            // Early stopping
            if (generationsWithoutImprovement > 30) {
                logger.log(`🛑 Early stopping po ${gen} generacjach`);
                break;
            }
        }

        const elapsed = Date.now() - startTime;
        const improvement = bestIndividual.fitness - initialFitness;

        logger.log(`\n✅ GENETIC OPTYMALIZACJA ZAKOŃCZONA`);
        logger.log(`Czas: ${elapsed}ms`);
        logger.log(
            `Fitness: ${initialFitness} → ${bestIndividual.fitness} (${
                improvement > 0 ? "+" : ""
            }${improvement})`,
        );
        logger.log("🧬 === GENETIC OPTIMIZER - KONIEC ===\n");

        // Ostateczna deduplikacja przed zwróceniem
        this.fixConflicts(bestIndividual.shifts);

        return bestIndividual.shifts;
    }

    // =========================================================================
    // INICJALIZACJA
    // =========================================================================

    private initializePopulation(
        initialShifts: GeneratedShift[],
    ): Individual[] {
        const population: Individual[] = [];

        // Oryginalny osobnik
        population.push({
            shifts: [...initialShifts],
            fitness: quickFitness(initialShifts, this.input),
        });

        // Mutacje oryginału
        for (let i = 1; i < this.config.populationSize; i++) {
            const mutant: Individual = {
                shifts: [...initialShifts],
                fitness: 0,
            };

            // Losowa liczba mutacji
            const mutationCount = Math.floor(Math.random() * 3) + 1;
            for (let m = 0; m < mutationCount; m++) {
                this.mutate(mutant);
            }

            mutant.fitness = quickFitness(mutant.shifts, this.input);
            population.push(mutant);
        }

        return population;
    }

    // =========================================================================
    // OPERATORY GENETYCZNE
    // =========================================================================

    private tournamentSelect(population: Individual[]): Individual {
        let best: Individual | null = null;

        for (let i = 0; i < this.config.tournamentSize; i++) {
            const idx = Math.floor(Math.random() * population.length);
            const candidate = population[idx];

            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }

        return best!;
    }

    private crossover(parent1: Individual, parent2: Individual): Individual {
        // Jednopunktowe krzyżowanie po dniach
        const days1 = this.groupByDay(parent1.shifts);
        const days2 = this.groupByDay(parent2.shifts);

        const allDays = [...new Set([...days1.keys(), ...days2.keys()])].sort();
        const crossoverPoint = Math.floor(Math.random() * allDays.length);

        const childShifts: GeneratedShift[] = [];

        for (let i = 0; i < allDays.length; i++) {
            const day = allDays[i];
            const source = i < crossoverPoint ? days1 : days2;
            const dayShifts = source.get(day) || [];
            childShifts.push(...dayShifts);
        }

        // Napraw konflikty (duplikaty pracownik-dzień)
        this.fixConflicts(childShifts);

        return {
            shifts: childShifts,
            fitness: 0,
        };
    }

    private mutate(individual: Individual): void {
        const operation = Math.random();

        if (operation < 0.4) {
            // Swap: zamień pracowników między zmianami
            this.mutateSwap(individual);
        } else if (operation < 0.7) {
            // Move: przenieś zmianę na inny dzień
            this.mutateMove(individual);
        } else {
            // Change template: zmień szablon zmiany
            this.mutateTemplate(individual);
        }
    }

    private mutateSwap(individual: Individual): void {
        if (individual.shifts.length < 2) return;

        const idx1 = Math.floor(Math.random() * individual.shifts.length);
        let idx2 = Math.floor(Math.random() * individual.shifts.length);
        while (idx2 === idx1) {
            idx2 = Math.floor(Math.random() * individual.shifts.length);
        }

        const shift1 = individual.shifts[idx1];
        const shift2 = individual.shifts[idx2];

        // Sprawdź czy zamiana jest możliwa
        if (shift1.date === shift2.date) return; // Ten sam dzień
        if (shift1.employee_id === shift2.employee_id) return; // Ten sam pracownik

        const emp1 = this.input.employees.find(
            (e) => e.id === shift1.employee_id,
        );
        const emp2 = this.input.employees.find(
            (e) => e.id === shift2.employee_id,
        );
        if (!emp1 || !emp2) return;

        // Sprawdź czy pracownicy mogą pracować w zamienione dni
        if (
            !this.canWork(emp1, shift2.date) ||
            !this.canWork(emp2, shift1.date)
        )
            return;

        // WAŻNE: Sprawdź czy pracownicy nie mają już zmian w docelowe dni
        const emp1Dates = new Set(
            individual.shifts
                .filter((s, i) => s.employee_id === emp1.id && i !== idx1)
                .map((s) => s.date),
        );
        const emp2Dates = new Set(
            individual.shifts
                .filter((s, i) => s.employee_id === emp2.id && i !== idx2)
                .map((s) => s.date),
        );

        // emp1 dostaje shift2.date - sprawdź czy już ma zmianę w ten dzień
        if (emp1Dates.has(shift2.date)) return;
        // emp2 dostaje shift1.date - sprawdź czy już ma zmianę w ten dzień
        if (emp2Dates.has(shift1.date)) return;

        // Sprawdź hard constraints
        if (!this.checkSwapValid(individual.shifts, idx1, idx2)) return;

        // Wykonaj zamianę
        individual.shifts[idx1] = {
            ...shift1,
            employee_id: shift2.employee_id,
        };
        individual.shifts[idx2] = {
            ...shift2,
            employee_id: shift1.employee_id,
        };
    }

    private mutateMove(individual: Individual): void {
        if (individual.shifts.length === 0) return;

        const shiftIdx = Math.floor(Math.random() * individual.shifts.length);
        const shift = individual.shifts[shiftIdx];

        const emp = this.input.employees.find(
            (e) => e.id === shift.employee_id,
        );
        if (!emp) return;

        // Znajdź szablon dla tej zmiany (do sprawdzenia applicable_days)
        const template = this.input.templates.find(
            (t) => t.id === shift.template_id,
        );

        // Znajdź wolne dni
        const occupiedDates = new Set(
            individual.shifts
                .filter((s) => s.employee_id === shift.employee_id)
                .map((s) => s.date),
        );

        const freeDays = this.allWorkingDays.filter((day) => {
            if (occupiedDates.has(day)) return false;
            if (!this.canWork(emp, day)) return false;

            // ✅ Sprawdź czy szablon jest dostępny w ten dzień (applicable_days)
            if (
                template?.applicable_days &&
                template.applicable_days.length > 0
            ) {
                const dayKey = DAY_KEYS[getDayOfWeek(day)];
                if (!template.applicable_days.includes(dayKey as never))
                    return false;
            }

            return true;
        });

        if (freeDays.length === 0) return;

        const newDate = freeDays[Math.floor(Math.random() * freeDays.length)];

        // Sprawdź hard constraints
        const testShift = { ...shift, date: newDate };
        const otherShifts = individual.shifts.filter((_, i) => i !== shiftIdx);

        if (
            !checkHardConstraintsForShift(
                shift.employee_id,
                newDate,
                testShift,
                otherShifts,
            )
        )
            return;

        individual.shifts[shiftIdx] = testShift;
    }

    private mutateTemplate(individual: Individual): void {
        if (individual.shifts.length === 0) return;

        const shiftIdx = Math.floor(Math.random() * individual.shifts.length);
        const shift = individual.shifts[shiftIdx];

        const emp = this.input.employees.find(
            (e) => e.id === shift.employee_id,
        );
        if (!emp) return;

        // Oblicz dayKey dla dnia zmiany
        const shiftDayKey = DAY_KEYS[getDayOfWeek(shift.date)];

        // Znajdź dostępne szablony dla pracownika, które są też dostępne w ten dzień
        const availableTemplates = getAvailableTemplatesForEmployee(
            emp,
            this.input.templates,
            this.input.templateAssignmentsMap,
        ).filter((t) => {
            // ✅ Sprawdź czy szablon jest dostępny w ten dzień (applicable_days)
            if (t.applicable_days && t.applicable_days.length > 0) {
                if (!t.applicable_days.includes(shiftDayKey as never))
                    return false;
            }
            return true;
        });

        if (availableTemplates.length <= 1) return;

        // Wybierz inny szablon
        const otherTemplates = availableTemplates.filter(
            (t) => t.id !== shift.template_id,
        );
        if (otherTemplates.length === 0) return;

        const newTemplate =
            otherTemplates[Math.floor(Math.random() * otherTemplates.length)];

        individual.shifts[shiftIdx] = {
            ...shift,
            start_time: newTemplate.start_time.substring(0, 5),
            end_time: newTemplate.end_time.substring(0, 5),
            break_minutes: newTemplate.break_minutes ?? 0,
            template_id: newTemplate.id,
        };
    }

    // =========================================================================
    // POMOCNICZE
    // =========================================================================

    private clone(individual: Individual): Individual {
        return {
            shifts: individual.shifts.map((s) => ({ ...s })),
            fitness: individual.fitness,
        };
    }

    private groupByDay(
        shifts: GeneratedShift[],
    ): Map<string, GeneratedShift[]> {
        const map = new Map<string, GeneratedShift[]>();
        for (const shift of shifts) {
            if (!map.has(shift.date)) {
                map.set(shift.date, []);
            }
            map.get(shift.date)!.push(shift);
        }
        return map;
    }

    private fixConflicts(shifts: GeneratedShift[]): void {
        // Usuń duplikaty pracownik-dzień (zachowaj pierwszy)
        const seen = new Set<string>();
        const toRemove: number[] = [];

        for (let i = 0; i < shifts.length; i++) {
            const key = `${shifts[i].employee_id}-${shifts[i].date}`;
            if (seen.has(key)) {
                toRemove.push(i);
            } else {
                seen.add(key);
            }
        }

        // Usuń od końca żeby nie zaburzać indeksów
        for (let i = toRemove.length - 1; i >= 0; i--) {
            shifts.splice(toRemove[i], 1);
        }
    }

    private canWork(emp: EmployeeWithData, date: string): boolean {
        const dayOfWeek = new Date(date).getDay();
        const { holidays } = this.input;

        // Absencje
        if (emp.absences) {
            for (const absence of emp.absences) {
                if (date >= absence.start_date && date <= absence.end_date) {
                    return false;
                }
            }
        }

        // Preferencje (dane mogą być stringami lub liczbami w bazie)
        const unavailableDays =
            emp.preferences?.unavailable_days?.map((d: string | number) =>
                Number(d),
            ) || [];
        if (unavailableDays.includes(dayOfWeek)) {
            return false;
        }

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend && emp.preferences?.can_work_weekends === false) {
            return false;
        }

        const isHoliday = holidays.some((h) => h.date === date);
        if (isHoliday && emp.preferences?.can_work_holidays === false) {
            return false;
        }

        return true;
    }

    private checkSwapValid(
        shifts: GeneratedShift[],
        idx1: number,
        idx2: number,
    ): boolean {
        const shift1 = shifts[idx1];
        const shift2 = shifts[idx2];

        // Sprawdź hard constraints po zamianie
        const testShifts = shifts.map((s, i) => {
            if (i === idx1) return { ...s, employee_id: shift2.employee_id };
            if (i === idx2) return { ...s, employee_id: shift1.employee_id };
            return s;
        });

        // Sprawdź dla obu pracowników
        return (
            checkHardConstraintsForShift(
                shift2.employee_id,
                shift1.date,
                testShifts[idx1],
                testShifts.filter((_, i) => i !== idx1),
            ) &&
            checkHardConstraintsForShift(
                shift1.employee_id,
                shift2.date,
                testShifts[idx2],
                testShifts.filter((_, i) => i !== idx2),
            )
        );
    }
}
