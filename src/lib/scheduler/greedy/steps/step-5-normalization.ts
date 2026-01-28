import { logger } from "@/lib/utils/logger";
import { type SchedulerContext } from "../scheduler-context";
import { type EmployeeScheduleState } from "../../types";
import { getDayOfWeek } from "../../scheduler-utils";
import { DAY_KEYS } from "@/lib/constants/days";
import type { ShiftTemplate } from "@/types";

export class NormalizationStep {
    normalizeStaffing(context: SchedulerContext): void {
        logger.log("\n--- KROK 5: Normalizacja obsady ---");

        const { allWorkingDays, dailyTemplateStaffing, input } = context;
        const { templates } = input;

        let moves = 0;

        // Dla każdego szablonu spróbuj wyrównać obsadę między dniami
        for (const template of templates) {
            // Znajdź dni z nadmiarem i niedoborem dla tego szablonu
            let improved = true;
            while (improved) {
                improved = false;

                // Zbierz statystyki obsady dla tego szablonu w każdym dniu
                const staffingStats = allWorkingDays.map((day) => {
                    const count =
                        dailyTemplateStaffing.get(day)?.get(template.id)
                            ?.length || 0;
                    return { day, count };
                });

                // Sortuj po liczbie pracowników
                staffingStats.sort((a, b) => a.count - b.count);

                const minStaffing = staffingStats[0];
                const maxStaffing = staffingStats[staffingStats.length - 1];

                // Jeśli różnica jest duża (>1), spróbuj przenieść
                if (maxStaffing.count - minStaffing.count > 1) {
                    const success = this.tryMoveShift(
                        maxStaffing.day,
                        minStaffing.day,
                        template,
                        context,
                    );
                    if (success) {
                        moves++;
                        improved = true;
                    }
                }
            }
        }

        logger.log(`Normalizacja: wykonano ${moves} przeniesień`);

        // NOWOŚĆ: Balansowanie godzin między pracownikami (Transfery)
        this.balanceHoursBetweenEmployees(context);
    }

    private balanceHoursBetweenEmployees(context: SchedulerContext): void {
        const { employeeStates } = context;

        let transfers = 0;
        let attempts = 0;
        const MAX_TRANSFERS = 50; // Limit bezpieczeństwa

        // Powtarzaj dopóki udaje się znaleźć transfery
        let improved = true;
        while (improved && attempts < 10) {
            improved = false;
            attempts++;

            // Sortuj: Overworked (malejąco), Underworked (rosnąco)
            const employees = Array.from(employeeStates.values());
            const overworked = employees
                .filter((s) => s.currentHours > s.requiredHours + 2) // Mają nadgodziny > 2h (Obniżone z 4h)
                .sort((a, b) => b.currentHours - a.currentHours);

            const underworked = employees
                .filter((s) => s.currentHours < s.requiredHours - 2) // Mają niedobór > 2h (Obniżone z 4h)
                .sort((a, b) => a.currentHours - b.currentHours);

            if (overworked.length === 0 || underworked.length === 0) break;

            for (const giver of overworked) {
                for (const receiver of underworked) {
                    if (transfers >= MAX_TRANSFERS) break;

                    // STRICT CHECK: Nie przenoś jeśli giver jest już blisko celu
                    if (giver.currentHours <= giver.requiredHours + 0.5)
                        continue;

                    // Próbujemy znaleźć zmianę, którą Giver może oddać Receiverowi
                    const transferSuccess = this.tryTransferShift(
                        giver,
                        receiver,
                        context,
                    );
                    if (transferSuccess) {
                        transfers++;
                        improved = true;
                        // Jeśli receiver już nie jest underworked, przerywamy dla niego
                        if (receiver.currentHours >= receiver.requiredHours - 2)
                            // Obniżone z -4
                            break;
                    }
                }
            }
        }

        if (transfers > 0) {
            logger.log(
                `⚖️ Balansowanie godzin: wykonano ${transfers} transferów między pracownikami`,
            );
        }
    }

    private tryTransferShift(
        giver: EmployeeScheduleState,
        receiver: EmployeeScheduleState,
        context: SchedulerContext,
    ): boolean {
        const { shiftManager, candidateFinder, weekendDaysSet } = context;

        // Szukamy zmiany gievera, którą może wziąć receiver
        // Preferujemy zmiany, które NIE powodują, że giver staje się underworked
        // i NIE są weekendowe jeśli receiver nie chce (choć tu walczymy o godziny)

        const giverShifts = [...giver.shifts].sort(() => {
            // Najpierw oddajemy te z "środka tygodnia"
            // To prosta heurystyka
            return 0; // Randomizujemy lub bierzemy po kolei
        });

        for (const shift of giverShifts) {
            const date = shift.date;
            // Sprawdź czy receiver ma wolne w ten dzień
            if (receiver.occupiedDates.has(date)) continue;

            const template = context.input.templates.find(
                (t) => t.id === shift.template_id,
            );
            if (!template) continue;

            const isWeekend = weekendDaysSet.has(date);

            // Sprawdź czy receiver może wziąć tę zmianę
            if (
                candidateFinder.canAddShift(receiver, date, template, isWeekend)
            ) {
                // Sprawdź czy giver po oddaniu nie spadnie poniżej minimum (opcjonalne, ale dobre dla stabilności)
                // const hours = shift.end_time; // To need calculate duration
                // Uproszczenie: po prostu wykonujemy

                // TRANSFER
                shiftManager.removeShift(giver.emp.id, shift);
                shiftManager.addShift(receiver.emp.id, date, template);

                logger.log(
                    `  🤝 Transfer: ${giver.emp.first_name} -> ${receiver.emp.first_name} [${date}]`,
                );
                return true;
            }
        }
        return false;
    }

    private tryMoveShift(
        fromDay: string,
        toDay: string,
        template: ShiftTemplate,
        context: SchedulerContext,
    ): boolean {
        const {
            dailyTemplateStaffing,
            employeeStates,
            shiftManager,
            candidateFinder,
            weekendDaysSet,
        } = context;

        // Znajdź pracowników w dniu 'fromDay' na tym szablonie
        const sourceShifts =
            dailyTemplateStaffing.get(fromDay)?.get(template.id) || [];

        // Szukaj pracownika który może zostać przeniesiony
        for (const shift of sourceShifts) {
            const state = employeeStates.get(shift.employee_id);
            if (!state) continue;

            const isWeekend = weekendDaysSet.has(toDay);

            // Sprawdź czy może pracować w 'toDay'
            // Najpierw symulujemy usunięcie zmiany z 'fromDay'
            // (technicznie sprawdzamy czy może dodać do 'toDay' IGNORUJĄC 'fromDay' zajętość,
            // ale canAddShift sprawdza occupiedDates.has(toDay))
            // Pracownik w 'fromDay' ma zajęty 'fromDay'. 'toDay' powinien być wolny.

            // Sprawdzenie occupiedDates: pracownik ma zajęty fromDay, ale toDay może mieć wolny
            if (state.occupiedDates.has(toDay)) continue;
            // --- STRICT CHECK START ---
            // 1. Applicable Days Check for the TARGET DAY
            if (
                template.applicable_days &&
                template.applicable_days.length > 0
            ) {
                const dayKey = DAY_KEYS[getDayOfWeek(toDay)];
                if (!template.applicable_days.includes(dayKey as never)) {
                    continue; // Template forbidden on this day
                }
            }

            // Check MAX constraint for TARGET DAY (Crucial for preventing overstaffing during moves)
            if (
                template.max_employees !== null &&
                template.max_employees !== undefined
            ) {
                const currentTargetCount =
                    dailyTemplateStaffing.get(toDay)?.get(template.id)
                        ?.length || 0;
                if (currentTargetCount >= template.max_employees) {
                    continue; // Target is full, cannot move here
                }
            }
            // --- STRICT CHECK END ---
            // Sprawdź canAddShift dla toDay
            if (
                candidateFinder.canAddShift(state, toDay, template, isWeekend)
            ) {
                // Wykonaj przeniesienie
                shiftManager.removeShift(state.emp.id, shift);
                shiftManager.addShift(state.emp.id, toDay, template);

                logger.log(
                    `  ↔ Przeniesiono ${state.emp.first_name} [${template.name}]: ${fromDay} -> ${toDay}`,
                );
                return true;
            }
        }

        return false;
    }
}
