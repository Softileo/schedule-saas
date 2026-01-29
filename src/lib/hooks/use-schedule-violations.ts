"use client";

import { useMemo } from "react";
import type { LocalShift, ShiftTemplate } from "@/types";
import type { Employee, EmployeeAbsence } from "@/types";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { calculateRestHours } from "@/lib/scheduler/scheduler-utils";
import { calculateShiftHours } from "@/lib/utils/time-helpers";
import {
    MIN_DAILY_REST_HOURS,
    MAX_DAILY_WORK_HOURS,
    MAX_WEEKLY_WORK_HOURS_WITH_OVERTIME,
    RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS,
    MIN_WEEKLY_REST_HOURS,
    LABOR_CODE_VIOLATION_MESSAGES,
} from "@/lib/constants/labor-code";
import { parseISO, format, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";

interface UseScheduleViolationsProps {
    employees: Employee[];
    activeShifts: LocalShift[];
    absences?: EmployeeAbsence[];
    shiftTemplates?: ShiftTemplate[];
}

export type ViolationType =
    | "rest_11h"
    | "rest_35h"
    | "daily_hours"
    | "weekly_hours"
    | "consecutive_days"
    | "absence"
    | "staffing_min"
    | "staffing_max";

export interface ScheduleViolation {
    type: ViolationType;
    employeeId: string;
    employeeName: string;
    description: string;
    details?: string;
    affectedDates?: string[];
}

/**
 * Hook do wykrywania wszystkich naruszeń kodeksu pracy w grafiku
 */
export function useScheduleViolations({
    employees,
    activeShifts,
    absences = [],
    shiftTemplates = [], // Default empty
}: UseScheduleViolationsProps) {
    const violations = useMemo(() => {
        const result: ScheduleViolation[] = [];

        // --- 0. STAFFING LEVELS CHECKS (Global) ---
        if (shiftTemplates && shiftTemplates.length > 0) {
            // Group shifts by date + time
            const shiftsByTime = new Map<string, LocalShift[]>();
            activeShifts.forEach((s) => {
                const key = `${s.date}|${s.start_time}|${s.end_time}`;
                if (!shiftsByTime.has(key)) shiftsByTime.set(key, []);
                shiftsByTime.get(key)!.push(s);
            });

            shiftsByTime.forEach((shifts, key) => {
                const [date, start, end] = key.split("|");
                const count = shifts.length;

                // Find matching template
                const template = shiftTemplates.find(
                    (t) => t.start_time === start && t.end_time === end,
                );

                if (template) {
                    if (count < template.min_employees) {
                        result.push({
                            type: "staffing_min",
                            employeeId: "system",
                            employeeName: `Braki kadrowe: ${start.slice(0, 5)}-${end.slice(0, 5)}`,
                            description: `Wymagane min. ${template.min_employees} os.`,
                            details: `Jest ${count} os. w dniu ${format(
                                parseISO(date),
                                "d MMM",
                                { locale: pl },
                            )}`,
                            affectedDates: [date],
                        });
                    } else if (
                        template.max_employees &&
                        count > template.max_employees
                    ) {
                        result.push({
                            type: "staffing_max",
                            employeeId: "system",
                            employeeName: `Nadmiar kadrowy: ${start.slice(0, 5)}-${end.slice(0, 5)}`,
                            description: `Limit max. ${template.max_employees} os.`,
                            details: `Jest ${count} os. w dniu ${format(
                                parseISO(date),
                                "d MMM",
                                { locale: pl },
                            )}`,
                            affectedDates: [date],
                        });
                    }
                }
            });
        }

        employees.forEach((emp) => {
            const employeeName = getEmployeeFullName(emp);
            const employeeShifts = activeShifts
                .filter((s) => s.employee_id === emp.id)
                .sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date);

                    if (dateCompare !== 0) return dateCompare;
                    return a.end_time.localeCompare(b.end_time);
                });

            // 0. Sprawdź kolizje z nieobecnościami
            const employeeAbsences = absences.filter(
                (a) => a.employee_id === emp.id,
            );

            employeeShifts.forEach((shift) => {
                const shiftDate = parseISO(shift.date);
                const conflictingAbsence = employeeAbsences.find((absence) => {
                    const startDate = parseISO(absence.start_date);
                    const endDate = parseISO(absence.end_date);
                    // Sprawdzamy czy data zmiany mieści się w zakresie nieobecności (włącznie)
                    return shiftDate >= startDate && shiftDate <= endDate;
                });

                if (conflictingAbsence) {
                    result.push({
                        type: "absence",
                        employeeId: emp.id,
                        employeeName,
                        description: "Praca w trakcie nieobecności",
                        details: `${
                            conflictingAbsence.absence_type === "vacation"
                                ? "Urlop"
                                : "Nieobecność"
                        } w dniu ${format(shiftDate, "d MMM", { locale: pl })}`,
                        affectedDates: [shift.date],
                    });
                }
            });

            // 1. Sprawdź naruszenia 11h odpoczynku
            for (let i = 0; i < employeeShifts.length - 1; i++) {
                const currentShift = employeeShifts[i];
                const nextShift = employeeShifts[i + 1];

                const restHours = calculateRestHours(
                    currentShift.date,
                    currentShift.end_time,
                    nextShift.date,
                    nextShift.start_time,
                );

                if (restHours < MIN_DAILY_REST_HOURS && restHours >= 0) {
                    const date1 = parseISO(currentShift.date);
                    const date2 = parseISO(nextShift.date);
                    const dateStr =
                        currentShift.date === nextShift.date
                            ? format(date1, "d MMM", { locale: pl })
                            : `${format(date1, "d MMM", {
                                  locale: pl,
                              })} → ${format(date2, "d MMM", { locale: pl })}`;

                    result.push({
                        type: "rest_11h",
                        employeeId: emp.id,
                        employeeName,
                        description: LABOR_CODE_VIOLATION_MESSAGES.DAILY_REST,
                        details: `${dateStr} (${restHours.toFixed(1)}h)`,
                        affectedDates: [currentShift.date, nextShift.date],
                    });
                }
            }

            // 2. Sprawdź przekroczenie 8h/dobę (tylko jako ostrzeżenie o nadgodzinach)
            employeeShifts.forEach((shift) => {
                const hours = calculateShiftHours(
                    shift.start_time,
                    shift.end_time,
                    shift.break_minutes || 0,
                );

                if (hours > MAX_DAILY_WORK_HOURS) {
                    const date = parseISO(shift.date);
                    result.push({
                        type: "daily_hours",
                        employeeId: emp.id,
                        employeeName,
                        description: LABOR_CODE_VIOLATION_MESSAGES.DAILY_HOURS,
                        details: `${format(date, "d MMM", {
                            locale: pl,
                        })} (${hours.toFixed(1)}h)`,
                        affectedDates: [shift.date],
                    });
                }
            });

            // 3. Sprawdź przekroczenie 48h/tydzień oraz odpoczynek tygodniowy 35h
            // Grupuj zmiany po tygodniach (poniedziałek-niedziela)
            const shiftsByWeek = new Map<string, LocalShift[]>();

            employeeShifts.forEach((shift) => {
                const shiftDate = parseISO(shift.date);
                const dayOfWeek = shiftDate.getDay(); // 0 = Sun
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const monday = new Date(shiftDate);
                monday.setDate(monday.getDate() - daysToMonday);
                monday.setHours(0, 0, 0, 0);

                const weekKey = monday.toISOString().split("T")[0];
                const currentGroup = shiftsByWeek.get(weekKey) || [];
                currentGroup.push(shift);
                shiftsByWeek.set(weekKey, currentGroup);
            });

            shiftsByWeek.forEach((weekShifts, weekStart) => {
                // a) Suma godzin w tygodniu
                const totalHours = weekShifts.reduce((acc, shift) => {
                    return (
                        acc +
                        calculateShiftHours(
                            shift.start_time,
                            shift.end_time,
                            shift.break_minutes || 0,
                        )
                    );
                }, 0);

                const weekDate = parseISO(weekStart);
                const weekLabel = `tydzień od ${format(weekDate, "d MMM", {
                    locale: pl,
                })}`;

                if (totalHours > MAX_WEEKLY_WORK_HOURS_WITH_OVERTIME) {
                    result.push({
                        type: "weekly_hours",
                        employeeId: emp.id,
                        employeeName,
                        description: LABOR_CODE_VIOLATION_MESSAGES.WEEKLY_HOURS,
                        details: `${weekLabel} - ${totalHours.toFixed(1)}h`,
                        affectedDates: weekShifts.map((s) => s.date),
                    });
                }

                // b) Odpoczynek tygodniowy 35h
                // Sortuj zmiany w tygodniu chronologicznie
                const sortedWeekShifts = [...weekShifts].sort((a, b) => {
                    const dateDiff = a.date.localeCompare(b.date);
                    if (dateDiff !== 0) return dateDiff;
                    return a.start_time.localeCompare(b.start_time);
                });

                let has35hBreak = false;

                // Sprawdź przerwy między zmianami wewnątrz tygodnia
                for (let i = 0; i < sortedWeekShifts.length - 1; i++) {
                    const s1 = sortedWeekShifts[i];
                    const s2 = sortedWeekShifts[i + 1];
                    const rest = calculateRestHours(
                        s1.date,
                        s1.end_time,
                        s2.date,
                        s2.start_time,
                    );
                    if (rest >= MIN_WEEKLY_REST_HOURS) {
                        has35hBreak = true;
                        break;
                    }
                }

                // Jeśli nie znaleziono w środku tygodnia, sprawdź przerwę po ostatniej zmianie
                // Uwaga: To jest uproszczenie, bo nie patrzymy na zmiany z przyszłego tygodnia tutaj,
                // ale zazwyczaj odpoczynek weekendowy jest na końcu.
                // Dla precyzji powinniśmy patrzeć na ciągłość, ale w kontekście danego tygodnia
                // weryfikujemy czy w TYM tygodniu wystąpił taki odpoczynek.

                // Zgodnie z interpretacją PIP, odpoczynek 35h musi przypadać W KAŻDYM tygodniu.
                // Może obejmować weekend.
                // Sprawdźmy czy między ostatnią zmianą a końcem tygodnia (niedziela 24:00) jest 35h?
                // Nie, to zależy od następnej zmiany w kolejnym tygodniu.
                // Ale jeśli pracownik ma wolną niedzielę i sobotę, to ma >35h.
                // Jeśli pracuje w każdy dzień tygodnia, to prawdopodobnie nie ma.

                // Jeśli nie znaleziono przerwy >35h między zmianami, sprawdzamy czy suma przerw > 35h? Nie, musi być ciągła.

                // Jeśli pracownik nie pracuje wcale w jakieś dni, to ma przerwę.
                // Obliczmy luki między dniami pracy.

                // Jeśli liczba zmian w tygodniu < 6 (czyli max 5 dni pracy), to na pewno jest > 35h (24h doba + 11h odpoczynek).
                // Zakładamy, że nie ma zmian > 24h.
                // Uproszczenie: jeśli pracuje <= 5 dni w tygodniu, to ma odpoczynek (np. weekend).
                // Jeśli pracuje 6-7 dni, trzeba sprawdzić dokładnie.

                // Bardziej precyzyjne podejście:
                // Weźmy początek tygodnia (Pon 00:00) i koniec (Niedz 24:00).
                // Ale odpoczynek może "zachodzić" na przełom tygodni.
                // Skoro to warning, zróbmy proste sprawdzenie:
                // Czy jest jakakolwiek przerwa > 35h pomiędzy końcem jednej a początkiem drugiej zmiany w ramach tygodnia
                // LUB czy od początku tygodnia do pierwszej zmiany jest 35h
                // LUB czy od ostatniej zmiany do końca tygodnia jest 35h (zakładając że kolejny tydzień zaczyna się w poniedziałek).

                if (!has35hBreak) {
                    // Sprawdź przerwę na początku tygodnia (od poniedziałku 00:00 do pierwszej zmiany)
                    // To jest słabe, bo nie wiemy o poprzednim tygodniu.
                    // Lepiej: jeśli pracuje > 5 dni w tygodniu i nie wykryto luki 35h między zmianami.

                    const uniqueDays = new Set(
                        sortedWeekShifts.map((s) => s.date),
                    ).size;

                    // Jeśli pracuje 6 lub 7 dni, to ryzyko braku 35h jest wysokie.
                    // Jeśli 7 dni - na pewno brak (chyba że zmiany są super krótkie i dziwne).
                    // Jeśli 6 dni - może być brak (zależy od godzin).

                    if (uniqueDays >= 6 && !has35hBreak) {
                        // Dla pewności sprawdźmy czy między ostatnią zmianą poprzedniego tygodnia (jeśli dostępna)
                        // a pierwszą tego tygodnia jest 35h? Nie mamy dostępu do 'activeShifts' globalnie łatwo w pętli po mapie.
                        // Ale mamy sortedWeekShifts.

                        // Pomińmy skomplikowaną logikę cross-week - skupmy się na "wewnątrz tygodnia".
                        // Jeśli pracuje ciągiem bez przerwy 35h wewnątrz tygodnia, to potencjalne naruszenie.
                        // Dodatkowa heurystyka: czy weekend jest wolny?
                        // Jeśli ostatnia zmiana w piątek/sobota, a pierwsza w poniedziałek, to jest ok.
                        // Ale my iterujemy po tygodniach.

                        // Jeśli uniqueDays > 6 (czyli 7 dni pracy), to na 100% naruszenie.
                        if (uniqueDays === 7) {
                            result.push({
                                type: "rest_35h",
                                employeeId: emp.id,
                                employeeName,
                                description:
                                    LABOR_CODE_VIOLATION_MESSAGES.WEEKLY_REST,
                                details: `${weekLabel} - praca 7 dni w tygodniu`,
                                affectedDates: sortedWeekShifts.map(
                                    (s) => s.date,
                                ),
                            });
                        }
                        // Jeśli 6 dni, to brak 35h jest bardzo prawdopodobny jeśli nie znaleźliśmy luki.
                        // Jedyna szansa to: koniec pracy w Sobotę 13:00, start w nast. Poniedziałek - ale to poza tym "oknem".
                        // Art 133 mówi "w każdym tygodniu". Oznacza to, że w ramach tygodnia kalendarzowego
                        // musi się zmieścić ten odpoczynek? Nie, "tydzień" to okres rozliczeniowy.
                        // Przyjmijmy (bezpiecznie) warning przy 7 dniach pracy lub braku wykrytej przerwy przy 6 dniach.
                        else if (uniqueDays === 6) {
                            // Sprawdźmy czy ta przerwa nie jest np między Sob a Niedz (jeśli pracuje w Niedz a nie w Sob?)
                            // uniqueDays=6 oznacza że jeden dzień wolny. Dzień wolny = 24h + reszta z doby poprzedniej/następnej.
                            // Zwykle daje to 35h. Więc przy 6 dniach pracy zazwyczaj jest OK, chyba że zmiana kończy się późno a zaczyna wcześnie po dniu wolnym.
                            // Zostawmy warning tylko dla ewidentnych 7 dni lub braku wykrycia przerwy przy dużej gęstości zmian.
                            // Na razie: tylko 7 dni jako pewniak.
                        }
                    }
                }
            });

            // 4. Sprawdź przekroczenie maksymalnej liczby dni pracy z rzędu (polityka firmy)
            // Fix: Zbieramy cały ciąg dni i raportujemy tylko raz na koniec ciągu
            let consecutiveDays = 1;

            if (employeeShifts.length > 0) {
                for (let i = 1; i <= employeeShifts.length; i++) {
                    const isEndOfList = i === employeeShifts.length;
                    let isSequenceBroken = isEndOfList;

                    if (!isEndOfList) {
                        const prevDate = parseISO(employeeShifts[i - 1].date);
                        const currDate = parseISO(employeeShifts[i].date);
                        const diffDays = differenceInDays(currDate, prevDate);

                        // Jeśli różnica dni > 1 (luka) lub 0 (ta sama data - ignorujemy, bo to ten sam dzień pracy),
                        // to ciąg przerwany. Ale uwaga: jeśli diffDays === 0, to mamy 2 zmiany w tym samym dniu.
                        // To nadal ten sam dzień pracy w ciągu.
                        if (diffDays > 1) {
                            isSequenceBroken = true;
                        } else if (diffDays === 1) {
                            // Kontynuacja ciągu
                            consecutiveDays++;
                        }
                        // Jeśli diffDays === 0, nie zwiększamy consecutiveDays, ale ciąg trwa.
                    }

                    if (isSequenceBroken) {
                        if (
                            consecutiveDays >
                            RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS
                        ) {
                            // Znajdź datę początkową ciągu
                            // i to indeks elementu, który przerwał ciąg (lub koniec listy).
                            // Ostatnia zmiana w ciągu to employeeShifts[i-1].
                            // Musimy cofnąć się o tyle unikalnych dni ile wynosi consecutiveDays.
                            // Ale employeeShifts może mieć po kilka zmian w dniu.

                            // Łatwiej: weźmy datę ostatniej zmiany ciągu: employeeShifts[i-1].
                            // Data początkowa to:
                            // Start date... po prostu weźmy datę z pierwszego elementu ciągu?
                            // Ale nie mamy indeksu startu łatwo dostępnego bez cofania się.

                            // Ponieważ mamy posortowane, start date wyliczamy?
                            // Nie, bo mogą być luki w zmianach wewnątrz dnia.

                            // Znajdźmy index startowy.
                            // Idziemy w tył od i-1, aż zliczymy consecutiveDays unikalnych dat.
                            let daysCounted = 0;
                            let startIndex = i - 1;
                            let lastSeenDate = "";

                            for (let j = i - 1; j >= 0; j--) {
                                const d = employeeShifts[j].date;
                                if (d !== lastSeenDate) {
                                    daysCounted++;
                                    lastSeenDate = d;
                                }
                                if (daysCounted === consecutiveDays) {
                                    startIndex = j;
                                    // Sprawdź czy poprzedni (j-1) ma tą samą datę. Jeśli tak, to początek dnia jest wcześniejszy.
                                    // Ale nas interesuje data.
                                    break;
                                }
                            }

                            const startDate = parseISO(
                                employeeShifts[startIndex].date,
                            );

                            const violationShifts = employeeShifts.slice(
                                startIndex,
                                i,
                            );
                            const affectedDates = violationShifts.map(
                                (s) => s.date,
                            );

                            result.push({
                                type: "consecutive_days",
                                employeeId: emp.id,
                                employeeName,
                                description:
                                    LABOR_CODE_VIOLATION_MESSAGES.CONSECUTIVE_DAYS,
                                details: `od ${format(startDate, "d MMM", {
                                    locale: pl,
                                })} (${consecutiveDays} dni)`,
                                affectedDates,
                            });
                        }
                        consecutiveDays = 1;
                    }
                }
            }
        });

        // Usuń duplikaty (np. ten sam ciąg dni zgłoszony wielokrotnie)
        const uniqueResult = result.filter(
            (v, i, self) =>
                i ===
                self.findIndex(
                    (t) =>
                        t.type === v.type &&
                        t.employeeName === v.employeeName &&
                        t.details === v.details,
                ),
        );

        return uniqueResult;
    }, [employees, activeShifts, absences, shiftTemplates]);

    return violations;
}
