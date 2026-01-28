import { logger } from "@/lib/utils/logger";
import { type SchedulerContext } from "../scheduler-context";
// import type { ShiftTemplate } from "@/types";

export class EmergencyStaffingStep {
    emergencyStaffing(context: SchedulerContext): void {
        logger.log("\n--- KROK 4: Awaryjne obsadzenie ---");

        const {
            allWorkingDays,
            dailyTemplateStaffing,
            weekendDaysSet,
            input,
            shiftManager,
            candidateFinder,
        } = context;
        const { templates, settings } = input;
        const minEmployeesPerShift = settings.min_employees_per_shift || 1;

        let emergencyAdds = 0;

        for (const day of allWorkingDays) {
            const isWeekend = weekendDaysSet.has(day);
            const dayTemplateMap = dailyTemplateStaffing.get(day);
            if (!dayTemplateMap) continue;

            for (const [templateId, templateStaff] of dayTemplateMap) {
                const template = templates.find((t) => t.id === templateId);
                if (!template) continue;

                const minForThisTemplate =
                    template.min_employees ?? minEmployeesPerShift;

                // Sprawdź czy obsada jest wystarczająca
                if (templateStaff.length < minForThisTemplate) {
                    const missing = minForThisTemplate - templateStaff.length;

                    // Sprawdź ile osób jest dostępnych (nie na urlopie)
                    const availableCount =
                        candidateFinder.countAvailableEmployeesForDay(
                            day,
                            template,
                            isWeekend,
                        );

                    if (availableCount === -1) {
                        // Szablon niedostępny w ten dzień (applicable_days) - pomiń bez logowania błędu
                        continue;
                    }

                    if (availableCount === 0) {
                        // Wszyscy na urlopie - niemożliwe do obsadzenia
                        logger.warn(
                            `🚫 ${day} [${template.name}]: NIEMOŻLIWE DO OBSADZENIA - wszyscy na urlopie (brakuje ${missing})`,
                        );
                        continue; // Pomiń, bo nie ma sensu szukać
                    }

                    logger.warn(
                        `📉 ${day} [${template.name}]: Brakuje ${missing} pracowników (jest ${templateStaff.length}/${minForThisTemplate}, dostępnych: ${availableCount})`,
                    );

                    // Próbuj znaleźć kogoś z rozluźnionymi ograniczeniami
                    for (let i = 0; i < missing; i++) {
                        let candidate =
                            candidateFinder.findCandidateWithRelaxedHours(
                                day,
                                template,
                                isWeekend,
                            );

                        if (candidate) {
                            shiftManager.addShift(
                                candidate.emp.id,
                                day,
                                template,
                            );
                            logger.log(
                                `  🚑 AWARYJNIE dodano ${
                                    candidate.emp.first_name
                                } (nadgodziny: ${(
                                    candidate.currentHours -
                                    candidate.requiredHours
                                ).toFixed(1)}h)`,
                            );
                            emergencyAdds++;
                        } else if (availableCount <= 2) {
                            // Mało osób dostępnych - użyj nadgodzin awaryjnych (większy limit)
                            candidate =
                                candidateFinder.findEmergencyOvertimeCandidate(
                                    day,
                                    template,
                                    isWeekend,
                                );

                            if (candidate) {
                                shiftManager.addShift(
                                    candidate.emp.id,
                                    day,
                                    template,
                                );
                                logger.log(
                                    `  🆘 NADGODZINY AWARYJNE: ${
                                        candidate.emp.first_name
                                    } (tylko ${availableCount} osób dostępnych, nadgodziny: ${(
                                        candidate.currentHours -
                                        candidate.requiredHours
                                    ).toFixed(1)}h)`,
                                );
                                emergencyAdds++;
                            } else {
                                logger.error(
                                    `  ❌ KRYTYCZNE: Nie można obsadzić ${day} [${template.name}] - limit nadgodzin KP!`,
                                );
                            }
                        } else {
                            // DRUGA FAZA AWARYJNA - DESPERACJA
                            // Próbujemy znaleźć kogoś, kto już pracuje w tym dniu, ale może wziąć DŁUŻSZĄ zmianę (lub zmienić typ)
                            // A jeśli to nie, to szukamy absolutnie każdego, kto spełnia HARD CONSTRAINTS (ignorując nadgodziny całkowicie)
                            const desperateCandidate =
                                candidateFinder.findDesperateCandidate(
                                    day,
                                    template,
                                    isWeekend,
                                );

                            if (desperateCandidate) {
                                shiftManager.addShift(
                                    desperateCandidate.emp.id,
                                    day,
                                    template,
                                );
                                logger.log(
                                    `  🔥 DESPERACJA: Dodano ${
                                        desperateCandidate.emp.first_name
                                    } (nadgodziny: ${(
                                        desperateCandidate.currentHours -
                                        desperateCandidate.requiredHours
                                    ).toFixed(1)}h)`,
                                );
                                emergencyAdds++;
                            } else {
                                logger.error(
                                    `  ❌ KRYTYCZNE: Nie znaleziono nikogo na ${day} [${template.name}]!`,
                                );
                            }
                        }
                    }
                }
            }
        }

        logger.log(`Awaryjne obsadzenie: dodano ${emergencyAdds} zmian`);
    }
}
