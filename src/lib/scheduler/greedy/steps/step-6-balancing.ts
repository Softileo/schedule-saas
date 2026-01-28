import { logger } from "@/lib/utils/logger";
import { type SchedulerContext } from "../scheduler-context";
import { getTemplateHours, getDayOfWeek } from "../../scheduler-utils";
import { DAY_KEYS } from "@/lib/constants/days";
import type { ShiftTemplate } from "@/types";

export class BalancingStep {
    balanceTemplatesPerDay(context: SchedulerContext): void {
        logger.log("\n--- KROK 6: Balansowanie szablonów ---");

        const { allWorkingDays, dailyTemplateStaffing, input } = context;
        const { templates } = input;

        let moves = 0;

        for (const day of allWorkingDays) {
            const dayTemplateMap = dailyTemplateStaffing.get(day);
            if (!dayTemplateMap) continue;

            let improved = true;
            while (improved) {
                improved = false;

                // Znajdź szablony z nadmiarem i niedoborem W TYM SAMYM DNIU
                const currentStaffing = templates
                    .map((t) => ({
                        template: t,
                        count: dayTemplateMap.get(t.id)?.length || 0,
                    }))
                    .sort((a, b) => a.count - b.count);

                const minT = currentStaffing[0];
                const maxT = currentStaffing[currentStaffing.length - 1];

                // Jeśli różnica > 1, spróbuj zamienić szablon dla pracownika
                if (maxT.count - minT.count > 1) {
                    const success = this.tryMoveShiftBetweenTemplates(
                        day,
                        maxT.template,
                        minT.template,
                        context,
                    );
                    if (success) {
                        moves++;
                        improved = true;
                    }
                }
            }
        }
        logger.log(`Balansowanie: zamieniono ${moves} szablonów`);
    }

    private tryMoveShiftBetweenTemplates(
        day: string,
        fromTemplate: ShiftTemplate,
        toTemplate: ShiftTemplate,
        context: SchedulerContext,
    ): boolean {
        const {
            dailyTemplateStaffing,
            employeeStates,
            shiftManager,
            candidateFinder,
        } = context;

        // Pobierz pracowników na szablonie 'from'
        const shifts =
            dailyTemplateStaffing.get(day)?.get(fromTemplate.id) || [];

        for (const shift of shifts) {
            const state = employeeStates.get(shift.employee_id);
            if (!state) continue;

            // Sprawdź czy pracownik może pracować na szablonie 'to'
            // Musimy sprawdzić:
            // 1. Czy ma przypisany szablon 'to' w availableTemplates (canAddShift to sprawdza)
            // 2. Czy zmiana czasu pracy nie spowoduje kolizji/naruszeń (rest hours)

            // Symulujemy: usuwamy obecny, sprawdzamy 'toTemplate'

            // Uwaga: 'canAddShift' sprawdza occupiedDates. W tym dniu pracownik MA occupiedDate.
            // Musimy to obsłużyć.

            // Ręczne sprawdzenie availableTemplates
            if (!state.availableTemplates.some((t) => t.id === toTemplate.id))
                continue;

            // --- STRICT CHECK START ---
            // 0. Applicable Days Check (Crucial for Sunday issues)
            // Even if available in 'availableTemplates', is it allowed on THIS day?
            if (
                toTemplate.applicable_days &&
                toTemplate.applicable_days.length > 0
            ) {
                const dayKey = DAY_KEYS[getDayOfWeek(day)];

                if (!toTemplate.applicable_days.includes(dayKey as never)) {
                    continue; // Template not allowed on this day
                }
            }
            // --- STRICT CHECK END ---

            // Sprawdzenie limitu MAX pracowników dla szablonu docelowego
            if (
                toTemplate.max_employees !== null &&
                toTemplate.max_employees !== undefined
            ) {
                const targetStaffing =
                    dailyTemplateStaffing.get(day)?.get(toTemplate.id)
                        ?.length || 0;
                // Uwaga: tutaj 'addShift' doda pracownika, więc targetStaffing wzrośnie o 1.
                // Musimy upewnić się, że nie przekroczymy limitu.
                if (targetStaffing >= toTemplate.max_employees) continue;
            }

            // Sprawdzenie limitu MIN pracowników dla szablonu źródłowego (opcjonalnie, ale warto)
            const fromTemplateMin = fromTemplate.min_employees ?? 1; // Default 1
            const sourceStaffing =
                dailyTemplateStaffing.get(day)?.get(fromTemplate.id)?.length ||
                0;
            // Jeśli zabranie pracownika spowoduje spadek poniżej minimum, nie ruszajmy
            // Chyba że sourceStaffing > fromTemplateMin.
            if (sourceStaffing <= fromTemplateMin) continue;

            // Sprawdzenie godzin:
            // fromTemplate -> toTemplate.
            // Jeśli toTemplate ma więcej godzin, check if > required.
            const fromHours = getTemplateHours(fromTemplate);
            const toHours = getTemplateHours(toTemplate);

            if (
                state.currentHours - fromHours + toHours >
                state.requiredHours + 0.5
            )
                continue;

            // Sprawdzenie rest hours, etc.
            // Najlepiej użyć `checkDailyRest` z CandidateFinder
            // Ale shift jest w tym dniu. checkDailyRest sprawdza sąsiednie dni.
            // Zmiana godzin start/end w tym samym dniu może wpłynąć na rest hours z dnia poprzedniego/następnego.
            if (!candidateFinder.checkDailyRest(state, day, toTemplate))
                continue;

            // Wykonaj zamianę
            shiftManager.removeShift(state.emp.id, shift);
            shiftManager.addShift(state.emp.id, day, toTemplate);

            logger.log(
                `  🔄 ${state.emp.first_name} w ${day}: ${fromTemplate.name} -> ${toTemplate.name}`,
            );
            return true;
        }

        return false;
    }
}
