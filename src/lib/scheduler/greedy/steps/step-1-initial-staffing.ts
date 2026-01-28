import { logger } from "@/lib/utils/logger";
import { type SchedulerContext } from "../scheduler-context";

export class InitialStaffingStep {
    staffAllDays(context: SchedulerContext): void {
        logger.log("\n--- KROK 1: Obsada wszystkich dni ---");

        const {
            input,
            dailyTemplateStaffing,
            weekendDaysSet,
            tradingSundaysSet,
            saturdaysSet,
            allWorkingDays,
            shiftManager,
            candidateFinder,
            employeeStates,
        } = context;
        const { templates, settings, employees } = input;
        const minEmployeesPerShift = settings.min_employees_per_shift || 1;

        // Loguj wszystkie szablony z min/max employees
        logger.log("📋 Szablony zmian:");
        for (const t of templates) {
            logger.log(
                `   ${t.name} [${t.start_time.slice(0, 5)}-${t.end_time.slice(
                    0,
                    5,
                )}]: ` +
                    `min=${t.min_employees ?? minEmployeesPerShift}, ` +
                    `max=${t.max_employees ?? "∞"}, ` +
                    `days=${t.applicable_days?.join(",") || "all"}`,
            );
        }

        // KLUCZOWA ZMIANA: Sortuj dni z priorytetem WEEKENDY NAJPIERW
        const sortedDays = [...allWorkingDays].sort((a, b) => {
            const aIsTradingSunday = tradingSundaysSet.has(a);
            const bIsTradingSunday = tradingSundaysSet.has(b);
            const aIsSaturday = saturdaysSet.has(a);
            const bIsSaturday = saturdaysSet.has(b);

            if (aIsTradingSunday && !bIsTradingSunday) return -1;
            if (!aIsTradingSunday && bIsTradingSunday) return 1;

            if (aIsSaturday && !bIsSaturday) return -1;
            if (!aIsSaturday && bIsSaturday) return 1;

            return 0; // Remis dla zwykłych dni
        });

        // Teraz podziel na grupy i tasuj "zwykłe" dni, aby uniknąć chronologicznego biasu
        const sunDays = sortedDays.filter((d) => tradingSundaysSet.has(d));
        const satDays = sortedDays.filter((d) => saturdaysSet.has(d));
        const normalDays = sortedDays.filter(
            (d) => !tradingSundaysSet.has(d) && !saturdaysSet.has(d),
        );

        // Proste tasowanie Fisher-Yates dla normalDays
        for (let i = normalDays.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [normalDays[i], normalDays[j]] = [normalDays[j], normalDays[i]];
        }

        const finalDayOrder = [...sunDays, ...satDays, ...normalDays];

        logger.log(`Dni do obsadzenia: ${finalDayOrder.length}`);

        for (const day of finalDayOrder) {
            const isWeekend = weekendDaysSet.has(day);
            const dayTemplateMap = dailyTemplateStaffing.get(day);
            if (!dayTemplateMap) continue;

            // Zbieramy ID szablonów i tasujemy je, aby nie wypełniać zawsze 04:00 jako pierwszych
            const shiftTemplateIds = Array.from(dayTemplateMap.keys());
            for (let i = shiftTemplateIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shiftTemplateIds[i], shiftTemplateIds[j]] = [
                    shiftTemplateIds[j],
                    shiftTemplateIds[i],
                ];
            }

            for (const templateId of shiftTemplateIds) {
                const templateStaff = dayTemplateMap.get(templateId)!;
                const template = templates.find((t) => t.id === templateId);
                if (!template) continue;

                const minForThisTemplate =
                    template.min_employees ?? minEmployeesPerShift;
                const maxForThisTemplate = template.max_employees ?? Infinity;

                const targetStaffing = Math.min(
                    minForThisTemplate,
                    maxForThisTemplate,
                );

                let attempts = 0;
                while (
                    templateStaff.length < targetStaffing &&
                    templateStaff.length < maxForThisTemplate &&
                    attempts < 20
                ) {
                    attempts++;

                    let candidate = candidateFinder.findBestCandidate(
                        day,
                        template,
                        isWeekend,
                    );

                    if (
                        !candidate &&
                        templateStaff.length < minForThisTemplate
                    ) {
                        candidate =
                            candidateFinder.findCandidateWithRelaxedHours(
                                day,
                                template,
                                isWeekend,
                            );
                        if (candidate) {
                            logger.log(
                                `  ⚡ ${day} [${template.start_time.slice(
                                    0,
                                    5,
                                )}-${template.end_time.slice(0, 5)}]: ` +
                                    `${candidate.emp.first_name} z rozluźnionym limitem (min_employees=${minForThisTemplate})`,
                            );
                        }
                    }

                    // NOWA LOGIKA: Sprawdź ile osób jest dostępnych (nie na urlopie)
                    if (
                        !candidate &&
                        templateStaff.length < minForThisTemplate
                    ) {
                        const availableCount =
                            candidateFinder.countAvailableEmployeesForDay(
                                day,
                                template,
                                isWeekend,
                            );

                        if (availableCount === -1) {
                            // Szablon niedostępny w ten dzień (applicable_days) - nie loguj jako błąd
                            break;
                        } else if (availableCount === 0) {
                            // WSZYSCY NA URLOPIE - niemożliwe do obsadzenia
                            logger.warn(
                                `🚫 ${day} [${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}]: ` +
                                    `NIEMOŻLIWE DO OBSADZENIA - wszyscy pracownicy na urlopie/niedostępni`,
                            );
                            break;
                        } else if (availableCount <= 2) {
                            // Mało osób dostępnych - użyj nadgodzin awaryjnych
                            candidate =
                                candidateFinder.findEmergencyOvertimeCandidate(
                                    day,
                                    template,
                                    isWeekend,
                                );
                            if (candidate) {
                                logger.log(
                                    `  🆘 ${day} [${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}]: ` +
                                        `${candidate.emp.first_name} - NADGODZINY AWARYJNE ` +
                                        `(tylko ${availableCount} osób dostępnych, reszta na urlopie)`,
                                );
                            }
                        } else {
                            // Próba desperackiego kandydata (standardowe nadgodziny)
                            candidate = candidateFinder.findDesperateCandidate(
                                day,
                                template,
                                isWeekend,
                            );
                            if (candidate) {
                                logger.log(
                                    `  ⚠️ ${day} [${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}]: ` +
                                        `${candidate.emp.first_name} - tryb desperacji (nadgodziny)`,
                                );
                            }
                        }
                    }

                    if (!candidate) {
                        // Sprawdź ponownie czy to przez urlopy
                        const availableCount =
                            candidateFinder.countAvailableEmployeesForDay(
                                day,
                                template,
                                isWeekend,
                            );

                        if (availableCount === 0) {
                            logger.warn(
                                `🚫 ${day} [${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}]: ` +
                                    `NIEMOŻLIWE DO OBSADZENIA - wszyscy na urlopie`,
                            );
                        } else {
                            logger.warn(
                                `⚠ ${day} [${template.start_time.slice(
                                    0,
                                    5,
                                )}-${template.end_time.slice(
                                    0,
                                    5,
                                )}]: brak kandydata (obsada: ${
                                    templateStaff.length
                                }/${minForThisTemplate}${
                                    template.max_employees
                                        ? `, max=${template.max_employees}`
                                        : ""
                                }, dostępnych: ${availableCount})`,
                            );
                        }
                        break;
                    } else {
                        shiftManager.addShift(candidate.emp.id, day, template);
                        logger.log(
                            `  + [Krok 1] Dodano ${candidate.emp.first_name} ${candidate.emp.last_name} do ${template.name} w ${day}`,
                        );
                    }
                }
            }
        }
    }
}
