import { logger } from "@/lib/utils/logger";
import type { ShiftTemplate } from "@/types";
import { POLISH_LABOR_CODE } from "@/lib/constants/labor-code";
import { startOfWeek, endOfWeek, format } from "@/lib/utils/date-helpers";
import { DAY_KEYS } from "@/lib/constants/days";
import { type EmployeeScheduleState } from "../types";
import {
    getTemplateHours,
    calculateRestHours,
    daysDiff,
    parseDate,
    getShiftHours,
    getShiftTimeType,
    getDayOfWeek,
} from "../scheduler-utils";
import { type SchedulerContext } from "./scheduler-context";
import { canEmployeeWorkOnDate } from "../validation";
import { candidateScorer } from "./scoring-engine";

export class CandidateFinder {
    constructor(private context: SchedulerContext) {}

    findBestCandidate(
        day: string,
        template: ShiftTemplate,
        isWeekend: boolean,
    ): EmployeeScheduleState | null {
        const templateHours = getTemplateHours(template);

        // Najpierw zbierz wszystkich dostępnych kandydatów
        const availableStates = Array.from(
            this.context.employeeStates.values(),
        ).filter((state) => this.canAddShift(state, day, template, isWeekend));

        if (availableStates.length === 0) return null;

        // Oblicz minimum sobót i niedziel wśród DOSTĘPNYCH kandydatów
        const isSaturday = this.context.saturdaysSet.has(day);
        const isTradingSunday = this.context.tradingSundaysSet.has(day);

        const minSaturdaysAmongAvailable = isSaturday
            ? Math.min(...availableStates.map((s) => s.saturdayShiftCount))
            : 0;
        const minSundaysAmongAvailable = isTradingSunday
            ? Math.min(...availableStates.map((s) => s.sundayShiftCount))
            : 0;

        const avgDayStaffing = this.calculateAverageDayStaffing();

        // Calculate Global Shift Distribution (from ALL employees, not just available)
        // This ensures comparison against the "Whole Team" average
        const allEmployees = Array.from(this.context.employeeStates.values());
        const totalEmployees = allEmployees.length;
        const globalShiftCounts = allEmployees.reduce(
            (acc, curr) => {
                acc.morning += curr.morningShiftCount;
                acc.afternoon += curr.afternoonShiftCount;
                acc.evening += curr.eveningShiftCount;
                acc.total +=
                    curr.morningShiftCount +
                    curr.afternoonShiftCount +
                    curr.eveningShiftCount;
                return acc;
            },
            { morning: 0, afternoon: 0, evening: 0, total: 0 },
        );

        // Calculate Global Start Time Distribution
        const globalStartTimeCounts = new Map<string, number>();
        allEmployees.forEach((emp) => {
            emp.shifts.forEach((shift) => {
                const timeKey = shift.start_time.slice(0, 5);
                globalStartTimeCounts.set(
                    timeKey,
                    (globalStartTimeCounts.get(timeKey) || 0) + 1,
                );
            });
        });

        const candidates = availableStates
            .map((state) => {
                const scoringContext = {
                    state,
                    date: day,
                    template,
                    templateHours,
                    isWeekend,
                    isSaturday,
                    isTradingSunday,
                    minSaturdaysAmongAvailable,
                    minSundaysAmongAvailable,
                    avgDayStaffing,
                    globalShiftCounts,
                    globalStartTimeCounts, // Pass explicit start time stats
                    totalEmployees,
                    dailyStaffing: this.context.dailyStaffing,
                    quarterlyHistory: this.context.input.quarterlyHistory,
                    templateAssignmentsMap:
                        this.context.input.templateAssignmentsMap,
                };

                const score = candidateScorer.calculateScore(scoringContext);

                // Mały bonus za równomierne rozłożenie (mniej zmian = lepiej)
                return { state, score: score - state.shifts.length * 5 };
            })
            .sort((a, b) => b.score - a.score);

        // RANDOMIZATION FOR FAIRNESS (Wybierz jednego z top kandydatów)
        // Zwiększamy pulę do 5, aby dać większą szansę na uniknięcie lokalnych optimów
        // Przy dużym zespole to pomaga rozłożyć "dobre" zmiany
        if (candidates.length === 0) return null;

        let topCandidates = candidates.slice(0, 5);
        const bestScore = topCandidates[0].score;

        // Jeśli różnica punktowa jest ogromna, nie bierz gorszych
        topCandidates = topCandidates.filter((c) => bestScore - c.score < 2500);

        const randomIndex = Math.floor(Math.random() * topCandidates.length);
        const bestCandidate = topCandidates[randomIndex];

        if (bestCandidate.score < -40000) {
            logger.warn(
                `⚠ ${day} [${template.start_time.slice(
                    0,
                    5,
                )}-${template.end_time.slice(
                    0,
                    5,
                )}]: wszyscy kandydaci mają już pełne godziny`,
            );
            return null;
        }

        return bestCandidate.state;
    }

    findCandidateWithRelaxedHours(
        day: string,
        template: ShiftTemplate,
        isWeekend: boolean,
    ): EmployeeScheduleState | null {
        // Sprawdź czy szablon jest w ogóle dostępny w ten dzień (applicable_days)
        if (template.applicable_days && template.applicable_days.length > 0) {
            const dayKey = DAY_KEYS[getDayOfWeek(day)];
            if (!template.applicable_days.includes(dayKey as never)) {
                return null; // Szablon niedostępny w ten dzień
            }
        }

        const templateHours = getTemplateHours(template);

        const candidates = Array.from(this.context.employeeStates.values())
            .filter((state) => {
                if (state.occupiedDates.has(day)) return false;
                if (!state.availableTemplates.some((t) => t.id === template.id))
                    return false;

                if (
                    !canEmployeeWorkOnDate(
                        state.emp,
                        day,
                        this.context.input.holidays,
                    )
                )
                    return false;

                if (
                    isWeekend &&
                    state.emp.preferences?.can_work_weekends === false
                )
                    return false;

                if (
                    template.max_employees !== null &&
                    template.max_employees !== undefined
                ) {
                    const dayTemplateMap =
                        this.context.dailyTemplateStaffing.get(day);
                    if (dayTemplateMap) {
                        const templateStaff = dayTemplateMap.get(template.id);
                        if (
                            templateStaff &&
                            templateStaff.length >= template.max_employees
                        ) {
                            return false;
                        }
                    }
                }

                // ROZLUŹNIONY LIMIT: Pozwól na nadgodziny do +50% etatu (ale nie więcej niż twardy limit)
                // Użytkownik chce mniej godzin, ale jeśli brakuje ludzi - trzeba dać nadgodziny.
                // Zmieniam +4h na logiczniejszy limit procentowy.
                const hours = getTemplateHours(template);
                if (state.currentHours + hours > state.requiredHours * 1.5) {
                    return false;
                }

                // HARD CAP: Max 200h
                if (state.currentHours + hours > 200) return false;

                if (!this.checkDailyRest(state, day, template)) {
                    return false;
                }

                if (!this.checkConsecutiveDays(state, day)) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                const overtimeA = Math.max(
                    0,
                    a.currentHours + templateHours - a.requiredHours,
                );
                const overtimeB = Math.max(
                    0,
                    b.currentHours + templateHours - b.requiredHours,
                );

                // 1. Priorytet: Unikanie nadgodzin
                if (Math.abs(overtimeA - overtimeB) > 0.01) {
                    return overtimeA - overtimeB;
                }

                // 2. Balansowanie weekendów (jeśli to weekend)
                if (isWeekend) {
                    if (a.weekendShiftCount !== b.weekendShiftCount) {
                        return a.weekendShiftCount - b.weekendShiftCount;
                    }
                }

                // 3. Balansowanie typów zmian (Rano/Popołudnie/Wieczór)
                const shiftType = getShiftTimeType(
                    template.start_time,
                    template.name,
                );
                let typeCountA = 0;
                let typeCountB = 0;

                if (shiftType === "morning") {
                    typeCountA = a.morningShiftCount;
                    typeCountB = b.morningShiftCount;
                } else if (shiftType === "afternoon") {
                    typeCountA = a.afternoonShiftCount;
                    typeCountB = b.afternoonShiftCount;
                } else {
                    typeCountA = a.eveningShiftCount;
                    typeCountB = b.eveningShiftCount;
                }

                if (typeCountA !== typeCountB) {
                    return typeCountA - typeCountB;
                }

                // 4. Wyrównywanie % wykonania planu (kto ma większy deficyt procentowy)
                const saturationA =
                    a.requiredHours > 0 ? a.currentHours / a.requiredHours : 1;
                const saturationB =
                    b.requiredHours > 0 ? b.currentHours / b.requiredHours : 1;

                if (Math.abs(saturationA - saturationB) > 0.01) {
                    return saturationA - saturationB;
                }

                // 5. Ostateczny tie-breaker: liczba zmian
                return a.shifts.length - b.shifts.length;
            });

        return candidates[0] || null;
    }

    findDesperateCandidate(
        day: string,
        template: ShiftTemplate,
        isWeekend: boolean,
    ): EmployeeScheduleState | null {
        // Sprawdź czy szablon jest w ogóle dostępny w ten dzień (applicable_days)
        if (template.applicable_days && template.applicable_days.length > 0) {
            const dayKey = DAY_KEYS[getDayOfWeek(day)];
            if (!template.applicable_days.includes(dayKey as never)) {
                return null; // Szablon niedostępny w ten dzień
            }
        }

        const candidates = Array.from(this.context.employeeStates.values())
            .filter((state) => {
                // HARD CONSTRAINTS ONLY

                // 1. Czy już nie pracuje w tym dniu?
                if (state.occupiedDates.has(day)) return false;

                // 2. Czy ma ten szablon dostępny? (kompetencje)
                if (!state.availableTemplates.some((t) => t.id === template.id))
                    return false;

                // 3. Czy może pracować w ten dzień (absencje, sztywne niedostępności)
                if (
                    !canEmployeeWorkOnDate(
                        state.emp,
                        day,
                        this.context.input.holidays,
                    )
                )
                    return false;

                // 4. Weekend check - ale w desperacji możemy olać preferencję "nie lubię weekendów",
                // chyba że to jest "NIE MOGĘ" (tutaj zakładamy, że can_work_weekends to hard constraint z umowy)
                if (
                    isWeekend &&
                    state.emp.preferences?.can_work_weekends === false
                )
                    return false;

                // 5. Max employees check - to musimy respektować
                if (
                    template.max_employees !== null &&
                    template.max_employees !== undefined
                ) {
                    const dayTemplateMap =
                        this.context.dailyTemplateStaffing.get(day);
                    if (dayTemplateMap) {
                        const templateStaff = dayTemplateMap.get(template.id);
                        if (
                            templateStaff &&
                            templateStaff.length >= template.max_employees
                        ) {
                            return false;
                        }
                    }
                }

                // 6. Odpoczynek dobowy (HARD - KODEKS PRACY)
                if (!this.checkDailyRest(state, day, template)) {
                    return false;
                }

                // 7. Max dni z rzędu (RELAXED IN DESPERATION MODE)
                // W trybie awaryjnym (desperacji) ignorujemy limit dni z rzędu (np. 6),
                // ale nakładamy HARD CAP na 7 dni, żeby nie przegiąć (nie 8 ani 9).
                if (!this.checkConsecutiveDays(state, day, 7)) {
                    return false;
                }

                // Pozwalamy na max +12h nadgodzin (zamiast +25% lub 200h),
                // aby uniknąć sytuacji "Drastycznego Nadmiaru Hodzin".
                const hours = getTemplateHours(template);

                // ABSOLUTE MAX OVERTIME: 8h over contract (Reduced from 12h).
                const MAX_OVERTIME = 8;

                if (
                    state.currentHours + hours >
                    state.requiredHours + MAX_OVERTIME
                ) {
                    return false;
                }

                // UWAGA: Ignorujemy standardowy limit godzin (nadgodziny są dozwolone do SAFETY_CAP)

                return true;
            })
            .sort((a, b) => {
                // Preferujemy tych z mniejszymi nadgodzinami
                const overtimeA = Math.max(0, a.currentHours - a.requiredHours);
                const overtimeB = Math.max(0, b.currentHours - b.requiredHours);
                return overtimeA - overtimeB;
            });

        return candidates[0] || null;
    }

    public canAddShift(
        state: EmployeeScheduleState,
        date: string,
        template: ShiftTemplate,
        isWeekend: boolean,
    ): boolean {
        if (state.occupiedDates.has(date)) return false;

        if (!state.availableTemplates.some((t) => t.id === template.id))
            return false;

        if (
            !canEmployeeWorkOnDate(state.emp, date, this.context.input.holidays)
        )
            return false;

        if (
            template.max_employees !== null &&
            template.max_employees !== undefined
        ) {
            const dayTemplateMap = this.context.dailyTemplateStaffing.get(date);
            if (dayTemplateMap) {
                const templateStaff = dayTemplateMap.get(template.id);
                if (
                    templateStaff &&
                    templateStaff.length >= template.max_employees
                ) {
                    return false;
                }
            }
        }

        // Check applicable days
        if (template.applicable_days && template.applicable_days.length > 0) {
            const dayKey = DAY_KEYS[getDayOfWeek(date)];
            if (!template.applicable_days.includes(dayKey as never))
                return false;
        }

        if (isWeekend && state.emp.preferences?.can_work_weekends === false)
            return false;

        // FAIR DISTRIBUTION checks removed from HARD constraints.
        // Determining who gets the weekend shift should be done by the SCORING engine,
        // not by hard rejection here. This prevents "Staffing Failure" when the "fair" candidate
        // is unavailable due to other reasons.

        const hours = getTemplateHours(template);

        if (state.currentHours + hours > state.requiredHours + 0.5) {
            return false;
        }

        if (!this.checkDailyRest(state, date, template)) return false;

        if (!this.checkConsecutiveDays(state, date)) return false;

        // 8. Limit 48h/tydzień (HARD - Kodeks Pracy + BHP)
        if (!this.checkWeeklyLimit(state, date, template)) return false;

        return true;
    }

    public checkWeeklyLimit(
        state: EmployeeScheduleState,
        date: string,
        template: ShiftTemplate,
    ): boolean {
        // Oblicz daty graniczne tygodnia (Poniedziałek - Niedziela)
        const d = parseDate(date);
        const start = startOfWeek(d, { weekStartsOn: 1 });
        const end = endOfWeek(d, { weekStartsOn: 1 });

        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(end, "yyyy-MM-dd");

        let currentWeeklyHours = 0;

        for (const shift of state.shifts) {
            // Sprawdź czy zmiana mieści się w tym tygodniu
            if (shift.date >= startStr && shift.date <= endStr) {
                currentWeeklyHours += getShiftHours(shift);
            }
        }

        const newShiftHours = getTemplateHours(template);

        // Limit: 48h (z nadgodzinami)
        const limit =
            POLISH_LABOR_CODE.MAX_WEEKLY_WORK_HOURS_WITH_OVERTIME || 48;

        return currentWeeklyHours + newShiftHours <= limit;
    }

    public checkDailyRest(
        state: EmployeeScheduleState,
        newDate: string,
        template: ShiftTemplate,
    ): boolean {
        const newStart = template.start_time.substring(0, 5);
        const newEnd = template.end_time.substring(0, 5);

        for (const shift of state.shifts) {
            const shiftDate = shift.date;
            const diffDays = daysDiff(shiftDate, newDate);

            if (Math.abs(diffDays) !== 1) continue;

            let restHours: number;
            if (diffDays === 1) {
                // Nowa zmiana jest NASTĘPNEGO dnia po istniejącej
                restHours = calculateRestHours(
                    shiftDate,
                    shift.end_time,
                    newDate,
                    newStart,
                );
            } else {
                // Nowa zmiana jest DZIEŃ PRZED istniejącą
                restHours = calculateRestHours(
                    newDate,
                    newEnd,
                    shiftDate,
                    shift.start_time,
                );
            }

            if (restHours < 11) return false;
        }
        return true;
    }

    /**
     * EMERGENCY OVERTIME CANDIDATE
     *
     * Znajduje kandydata gdy tylko 1 osoba jest dostępna (reszta na urlopie).
     * Pozwala na większe nadgodziny niż normalnie, ale w ramach Kodeksu Pracy:
     * - Max 48h/tydzień (Art. 131 § 1 KP)
     * - 11h odpoczynku dobowego
     * - Max 7 dni z rzędu
     */
    findEmergencyOvertimeCandidate(
        day: string,
        template: ShiftTemplate,
        isWeekend: boolean,
    ): EmployeeScheduleState | null {
        // Sprawdź czy szablon jest w ogóle dostępny w ten dzień (applicable_days)
        if (template.applicable_days && template.applicable_days.length > 0) {
            const dayKey = DAY_KEYS[getDayOfWeek(day)];
            if (!template.applicable_days.includes(dayKey as never)) {
                return null; // Szablon niedostępny w ten dzień
            }
        }

        const candidates = Array.from(this.context.employeeStates.values())
            .filter((state) => {
                // 1. Czy już nie pracuje w tym dniu?
                if (state.occupiedDates.has(day)) return false;

                // 2. Czy ma ten szablon dostępny? (kompetencje)
                if (!state.availableTemplates.some((t) => t.id === template.id))
                    return false;

                // 3. Czy może pracować w ten dzień (absencje)
                if (
                    !canEmployeeWorkOnDate(
                        state.emp,
                        day,
                        this.context.input.holidays,
                    )
                )
                    return false;

                // 4. Weekend - sprawdź tylko hard constraint
                if (
                    isWeekend &&
                    state.emp.preferences?.can_work_weekends === false
                )
                    return false;

                // 5. Max employees na szablon
                if (
                    template.max_employees !== null &&
                    template.max_employees !== undefined
                ) {
                    const dayTemplateMap =
                        this.context.dailyTemplateStaffing.get(day);
                    if (dayTemplateMap) {
                        const templateStaff = dayTemplateMap.get(template.id);
                        if (
                            templateStaff &&
                            templateStaff.length >= template.max_employees
                        ) {
                            return false;
                        }
                    }
                }

                // 6. Odpoczynek dobowy 11h (HARD - KODEKS PRACY)
                if (!this.checkDailyRest(state, day, template)) {
                    return false;
                }

                // 7. Max 7 dni z rzędu (HARD)
                if (!this.checkConsecutiveDays(state, day, 7)) {
                    return false;
                }

                // 8. Limit 48h/tydzień (HARD - Kodeks Pracy)
                if (!this.checkWeeklyLimit(state, day, template)) {
                    return false;
                }

                // 9. EMERGENCY: Pozwalamy na nadgodziny do +16h ponad etat
                // (bo to sytuacja awaryjna gdy wszyscy inni na urlopie)
                const hours = getTemplateHours(template);
                const MAX_EMERGENCY_OVERTIME = 16; // Max 2 dni nadgodzin w miesiącu

                if (
                    state.currentHours + hours >
                    state.requiredHours + MAX_EMERGENCY_OVERTIME
                ) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                // Preferujemy tych z mniejszymi nadgodzinami
                const overtimeA = Math.max(0, a.currentHours - a.requiredHours);
                const overtimeB = Math.max(0, b.currentHours - b.requiredHours);
                return overtimeA - overtimeB;
            });

        return candidates[0] || null;
    }

    /**
     * Sprawdza ilu pracowników jest DOSTĘPNYCH (nie na urlopie) w danym dniu
     * dla danego szablonu
     */
    countAvailableEmployeesForDay(
        day: string,
        template: ShiftTemplate,
        isWeekend: boolean,
    ): number {
        // Sprawdź czy szablon jest w ogóle dostępny w ten dzień (applicable_days)
        if (template.applicable_days && template.applicable_days.length > 0) {
            const dayKey = DAY_KEYS[getDayOfWeek(day)];
            if (!template.applicable_days.includes(dayKey as never)) {
                return -1; // Szablon niedostępny w ten dzień (-1 oznacza "nie dotyczy")
            }
        }

        let count = 0;
        for (const state of this.context.employeeStates.values()) {
            // Sprawdź absencje
            if (
                !canEmployeeWorkOnDate(
                    state.emp,
                    day,
                    this.context.input.holidays,
                )
            ) {
                continue;
            }

            // Sprawdź weekend
            if (
                isWeekend &&
                state.emp.preferences?.can_work_weekends === false
            ) {
                continue;
            }

            // Sprawdź czy ma szablon
            if (!state.availableTemplates.some((t) => t.id === template.id)) {
                continue;
            }

            count++;
        }
        return count;
    }

    public checkConsecutiveDays(
        state: EmployeeScheduleState,
        date: string,
        limit: number = POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS,
    ): boolean {
        // Fix: Use safe date arithmetic that avoids UTC/Local timezone issues
        // which caused off-by-one errors in consecutive day counting.

        const checkDirection = (startStr: string, offset: number): number => {
            let count = 0;
            const current = parseDate(startStr); // Uses local time YYYY, MM, DD

            // Move one step first
            current.setDate(current.getDate() + offset);

            while (true) {
                // Format safely to YYYY-MM-DD
                const y = current.getFullYear();
                const m = String(current.getMonth() + 1).padStart(2, "0");
                const d = String(current.getDate()).padStart(2, "0");
                const dateStr = `${y}-${m}-${d}`;

                if (state.occupiedDates.has(dateStr)) {
                    count++;
                    current.setDate(current.getDate() + offset);
                } else {
                    break;
                }

                if (count >= limit) break;
            }
            return count;
        };

        const consecutiveBefore = checkDirection(date, -1);
        const consecutiveAfter = checkDirection(date, 1);

        const totalConsecutive = consecutiveBefore + 1 + consecutiveAfter;

        return totalConsecutive <= limit;
    }

    private calculateAverageDayStaffing(): number {
        let total = 0;
        for (const day of this.context.allWorkingDays) {
            total += this.context.dailyStaffing.get(day)?.length || 0;
        }
        return total / this.context.allWorkingDays.length;
    }
}
