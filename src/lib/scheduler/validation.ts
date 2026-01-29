/**
 * =============================================================================
 * SCHEDULER VALIDATION - Walidacja zgodności z Kodeksem Pracy
 * =============================================================================
 *
 * Funkcje sprawdzające zgodność z polskim prawem pracy:
 * - Art. 132 KP: 11h odpoczynku dobowego
 * - Art. 147 KP: Max 5 dni pracy z rzędu
 * - Absencje (urlopy, chorobowe)
 */

import {
    POLISH_LABOR_CODE,
    type EmployeeScheduleState,
    type EmployeeState,
    type EmployeeWithData,
    type GeneratedShift,
} from "./types";
import {
    getTemplateHours,
    calculateRestHours,
    getDayOfWeek,
    daysDiff,
    getWeekStart,
    parseDate,
} from "./scheduler-utils";
import type { ShiftTemplate, PublicHoliday } from "@/types";
import { logger } from "@/lib/utils/logger";
import { checkEmployeeAbsence } from "@/lib/core/schedule/utils";

/**
 * Sprawdza czy pracownik może pracować w danym dniu
 */
export function canEmployeeWorkOnDate(
    emp: EmployeeWithData,
    date: string,
    holidays: PublicHoliday[],
): boolean {
    const dayOfWeek = getDayOfWeek(date);
    const isHoliday = holidays.some((h) => h.date === date);

    // Sprawdź absencje
    const absence = checkEmployeeAbsence(emp.id, date, emp.absences || []);
    if (absence) {
        logger.log(
            `🛑 ${emp.first_name} ${emp.last_name} NIE MOŻE pracować ${date} - ma ${absence.absence_type} (${absence.start_date} do ${absence.end_date})`,
        );
        return false;
    }

    // Sprawdź preferencje dni niedostępnych (dane mogą być stringami lub liczbami)
    const unavailableDays =
        emp.preferences?.unavailable_days?.map((d: string | number) =>
            Number(d),
        ) || [];
    if (unavailableDays.includes(dayOfWeek)) {
        return false;
    }

    // Sprawdź weekendy
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && emp.preferences?.can_work_weekends === false) {
        return false;
    }

    // Sprawdź święta
    if (isHoliday && emp.preferences?.can_work_holidays === false) {
        return false;
    }

    return true;
}

/**
 * Sprawdza hard constraints dla dodania nowej zmiany (używane przez ILP i Genetic optymizatory)
 * - 11h odpoczynku dobowego (Art. 132 KP)
 * - Max 5 dni pracy z rzędu (Art. 147 KP)
 */
export function checkHardConstraintsForShift(
    empId: string,
    newDate: string,
    newShift: GeneratedShift,
    otherShifts: GeneratedShift[],
): boolean {
    // Pobierz zmiany tego pracownika
    const empShifts = otherShifts
        .filter((s) => s.employee_id === empId)
        .sort((a, b) => a.date.localeCompare(b.date));

    // Sprawdź 11h odpoczynku
    for (const shift of empShifts) {
        const diff = daysDiff(shift.date, newDate);

        if (Math.abs(diff) === 1) {
            let restHours: number;
            if (diff === 1) {
                // shift jest przed newShift
                restHours = calculateRestHours(
                    shift.date,
                    shift.end_time,
                    newDate,
                    newShift.start_time,
                );
            } else {
                // newShift jest przed shift
                restHours = calculateRestHours(
                    newDate,
                    newShift.end_time,
                    shift.date,
                    shift.start_time,
                );
            }

            if (
                restHours > 0 &&
                restHours < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS
            ) {
                return false;
            }
        }
    }

    // Sprawdź max 5 dni z rzędu
    const allDates = [...empShifts.map((s) => s.date), newDate].sort();
    let consecutive = 1;
    for (let i = 1; i < allDates.length; i++) {
        if (daysDiff(allDates[i - 1], allDates[i]) === 1) {
            consecutive++;
            if (consecutive > POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS) {
                return false;
            }
        } else {
            consecutive = 1;
        }
    }

    return true;
}

/**
 * Helper function to check rest hours between shifts
 * @returns false if rest violation detected, true otherwise
 */
function checkRestHoursBetweenShifts(
    shifts: { date: string; start_time: string; end_time: string }[],
    newDate: string,
    newStart: string,
    newEnd: string,
): boolean {
    for (const shift of shifts) {
        const shiftDate = shift.date;
        const diffDays = daysDiff(shiftDate, newDate);

        // Tylko sąsiednie dni są istotne
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
            // Nowa zmiana jest POPRZEDNIEGO dnia przed istniejącą
            restHours = calculateRestHours(
                newDate,
                newEnd,
                shiftDate,
                shift.start_time,
            );
        }

        if (
            restHours > 0 &&
            restHours < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS
        ) {
            return false;
        }
    }

    return true;
}

/**
 * Sprawdza 11h odpoczynku dobowego (Art. 132 KP)
 */
export function checkDailyRest(
    shifts: GeneratedShift[],
    newDate: string,
    template: ShiftTemplate,
): boolean {
    const newStart = template.start_time.substring(0, 5);
    const newEnd = template.end_time.substring(0, 5);

    return checkRestHoursBetweenShifts(shifts, newDate, newStart, newEnd);
}

/**
 * Sprawdza max 5 dni pracy z rzędu (Art. 147 KP)
 */
export function checkConsecutiveDays(
    occupiedDates: Set<string>,
    newDate: string,
): boolean {
    const baseDate = new Date(newDate);
    let consecutiveBefore = 0;
    let consecutiveAfter = 0;

    // Sprawdź dni przed
    for (let i = 1; i <= POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS; i++) {
        const checkDate = new Date(baseDate);
        checkDate.setDate(checkDate.getDate() - i);
        const checkStr = checkDate.toISOString().split("T")[0];
        if (occupiedDates.has(checkStr)) {
            consecutiveBefore++;
        } else {
            break;
        }
    }

    // Sprawdź dni po
    for (let i = 1; i <= POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS; i++) {
        const checkDate = new Date(baseDate);
        checkDate.setDate(checkDate.getDate() + i);
        const checkStr = checkDate.toISOString().split("T")[0];
        if (occupiedDates.has(checkStr)) {
            consecutiveAfter++;
        } else {
            break;
        }
    }

    // Łącznie z nowym dniem
    const totalConsecutive = consecutiveBefore + 1 + consecutiveAfter;
    return totalConsecutive <= POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS;
}

import { timeToMinutes, formatDateToISO } from "@/lib/utils/date-helpers";

/**
 * Sprawdza 35h nieprzerwanego odpoczynku tygodniowego (Art. 133 KP)
 * Weryfikuje czy w tygodniu kalendarzowym (pon-ndz) obejmującym nową datę
 * występuje co najmniej jedna przerwa >= 35h.
 */
export function checkWeeklyRest(
    state: EmployeeScheduleState,
    newDate: string,
    newTemplate: ShiftTemplate,
): boolean {
    // 1. Wyznacz granice tygodnia (Poniedziałek - Niedziela)
    const weekMondayStr = getWeekStart(newDate);
    // getWeekStart zwraca YYYY-MM-DD (Poniedziałek)

    // Oblicz Niedzielę i "Następny Poniedziałek 00:00"
    const weekMonday = parseDate(weekMondayStr);

    // Niedziela (koniec tygodnia)
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekSunday.getDate() + 6);
    const weekSundayStr = formatDateToISO(weekSunday);

    // Następny poniedziałek (dla domknięcia tygodnia)
    const nextMonday = new Date(weekSunday);
    nextMonday.setDate(nextMonday.getDate() + 1);
    const nextMondayStr = formatDateToISO(nextMonday);

    // 2. Zbierz wszystkie zmiany w tym tygodniu
    interface SimpleShift {
        date: string;
        start: string;
        end: string;
    }

    const weekShifts: SimpleShift[] = [];

    // Dodaj istniejące zmiany
    for (const s of state.shifts) {
        if (s.date >= weekMondayStr && s.date <= weekSundayStr) {
            weekShifts.push({
                date: s.date,
                start: s.start_time,
                end: s.end_time,
            });
        }
    }

    // Dodaj nową (hipotetyczną) zmianę
    weekShifts.push({
        date: newDate,
        start: newTemplate.start_time,
        end: newTemplate.end_time,
    });

    // Sortuj chronologicznie
    weekShifts.sort((a, b) => a.date.localeCompare(b.date));

    // Jeśli brak zmian (tylko ta jedna nowa), to mamy >35h reszty z definicji (tydzień ma 168h)
    // Ale sprawdzamy to poniżej w logice luk.

    let maxRest = 0;

    // 3. Sprawdź luki
    if (weekShifts.length > 0) {
        // Luka A: Od początku tygodnia (Pon 00:00) do pierwszej zmiany
        // Zakładamy, że pracownik był wolny przed Pon 00:00 (uproszczenie)
        // calculateRestHours(LastEnd, NextStart). Używamy Pon 00:00 jako "LastEnd".
        const first = weekShifts[0];
        const startGap = calculateRestHours(
            weekMondayStr,
            "00:00",
            first.date,
            first.start,
        );
        if (startGap > maxRest) maxRest = startGap;

        // Luka B: Pomiędzy zmianami
        for (let i = 0; i < weekShifts.length - 1; i++) {
            const current = weekShifts[i];
            const next = weekShifts[i + 1];

            // calculateRestHours radzi sobie z przejściem przez północ
            // Musimy tylko uważać na overnight shifts w 'current'
            // calculateRestHours bierze (lastDate, lastEnd, newDate, newStart)
            // 'current.end' to np. "06:00". Jeśli shift był overnight, to ending time jest w D+1.
            // Ale GeneratedShift przechowuje date rozpoczęcia.
            // calculateRestHours NIE wie czy shift jest overnight, traktuje EndTime jako godzinę w LastDate
            // CHYBA ŻE calculateRestHours logic:
            // "if (diff === 1) { 24 - lastEnd ... }"
            // Jeśli current.end < current.start (overnight), to fizycznie koniec jest current.date + 1.
            // Wtedy calculateRestHours(current.date, current.end...) da BŁĘDNY wynik, bo potraktuje current.end jako godzinę w current.date.

            // Poprawka dla overnight:
            let effectiveCurrentEquivDate = current.date;
            if (timeToMinutes(current.end) < timeToMinutes(current.start)) {
                // Jeśli overnight, to koniec przypada dzień później
                // Musimy przesunąć datę "końca" dla calculateRestHours?
                // Nie, calculateRestHours operuje na "lastDate".
                // Jeśli podamy (current.date, current.end), funkcja potraktuje to jako godzinę w tym samym dniu.
                // A fizycznie to jest dzień później.
                // Więc musimy podać current.date + 1 dzień jako lastDate.

                const d = parseDate(current.date);
                d.setDate(d.getDate() + 1);
                effectiveCurrentEquivDate = formatDateToISO(d);
            }

            // Używamy helpera calculateRestHours z poprawną datą końca
            const gap = calculateRestHours(
                effectiveCurrentEquivDate,
                current.end,
                next.date,
                next.start,
            );
            if (gap > maxRest) maxRest = gap;
        }

        // Luka C: Od ostatniej zmiany do końca tygodnia (Ndz 24:00 aka Pon 00:00)
        const last = weekShifts[weekShifts.length - 1];
        let effectiveLastEquivDate = last.date;
        if (timeToMinutes(last.end) < timeToMinutes(last.start)) {
            const d = parseDate(last.date);
            d.setDate(d.getDate() + 1);
            effectiveLastEquivDate = formatDateToISO(d);
        }

        const endGap = calculateRestHours(
            effectiveLastEquivDate,
            last.end,
            nextMondayStr,
            "00:00",
        );
        if (endGap > maxRest) maxRest = endGap;
    } else {
        maxRest = 168;
    }

    return maxRest >= POLISH_LABOR_CODE.MIN_WEEKLY_REST_HOURS; // 35h
}

/**
 * Pełna walidacja czy można dodać zmianę
 */
export function canAddShift(
    state: EmployeeScheduleState,
    date: string,
    template: ShiftTemplate,
    isWeekend: boolean,
    holidays: PublicHoliday[],
    checkHoursLimit: boolean = true,
): boolean {
    // Już ma zmianę w ten dzień
    if (state.occupiedDates.has(date)) return false;

    // Nie może używać tego szablonu
    if (!state.availableTemplates.some((t) => t.id === template.id)) {
        return false;
    }

    // Sprawdź czy może pracować w ten dzień
    if (!canEmployeeWorkOnDate(state.emp, date, holidays)) return false;

    // Weekend check
    if (isWeekend && state.emp.preferences?.can_work_weekends === false) {
        return false;
    }

    // Odpoczynek dobowy 11h
    if (!checkDailyRest(state.shifts, date, template)) return false;

    // Ciągłość pracy (max dni z rzędu)
    if (!checkConsecutiveDays(state.occupiedDates, date)) return false;

    // Sprawdź limit godzin (z tolerancją 0.5h)
    if (checkHoursLimit) {
        const hours = getTemplateHours(template);
        if (state.currentHours + hours > state.requiredHours + 0.5) {
            return false;
        }
    }

    // KP Art. 132: 11h odpoczynku
    if (!checkDailyRest(state.shifts, date, template)) return false;

    // KP Art. 133: 35h odpoczynku tygodniowego
    if (!checkWeeklyRest(state, date, template)) return false;

    // KP Art. 147: max 5 dni z rzędu
    if (!checkConsecutiveDays(state.occupiedDates, date)) return false;

    return true;
}

// =============================================================================
// FUNKCJE DLA UPROSZCZONEGO EmployeeState (używane w staffing.ts)
// =============================================================================

/**
 * Sprawdza 11h odpoczynku dla uproszczonego stanu (assignedShifts z szablonami)
 */
export function checkDailyRestSimple(
    shifts: { date: string; template: ShiftTemplate }[],
    newDate: string,
    newTemplate: ShiftTemplate,
): boolean {
    const newStart = newTemplate.start_time.substring(0, 5);
    const newEnd = newTemplate.end_time.substring(0, 5);

    // Map to compatible format for helper
    const mappedShifts = shifts.map((shift) => ({
        date: shift.date,
        start_time: shift.template.start_time,
        end_time: shift.template.end_time,
    }));

    return checkRestHoursBetweenShifts(mappedShifts, newDate, newStart, newEnd);
}

/**
 * Pełna walidacja dla uproszczonego stanu (EmployeeState z staffing.ts)
 */
export function canAddShiftSimple(
    state: EmployeeState,
    date: string,
    template: ShiftTemplate,
    isWeekend: boolean,
    holidays: PublicHoliday[],
    checkHoursLimit: boolean = true,
): boolean {
    // Już ma zmianę w ten dzień
    if (state.occupiedDates.has(date)) return false;

    // Sprawdź limit godzin (z tolerancją 0.5h)
    if (checkHoursLimit) {
        const hours = getTemplateHours(template);
        if (state.assignedHours + hours > state.requiredHours + 0.5) {
            return false;
        }
    }

    // KP Art. 132: 11h odpoczynku
    if (!checkDailyRestSimple(state.assignedShifts, date, template))
        return false;

    // KP Art. 147: max 5 dni z rzędu
    if (!checkConsecutiveDays(state.occupiedDates, date)) return false;

    return true;
}
