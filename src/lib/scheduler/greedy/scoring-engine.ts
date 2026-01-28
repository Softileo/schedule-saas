import type { ShiftTemplate } from "@/types";
import {
    type EmployeeScheduleState,
    type GeneratedShift,
    type QuarterlyShiftHistory,
} from "../types";
import {
    getTemplateHours,
    getShiftTimeType,
    getDayOfWeek,
} from "../scheduler-utils";
import { SCORING_CONFIG } from "./config";

export interface ScoringContext {
    state: EmployeeScheduleState;
    date: string;
    template: ShiftTemplate;
    templateHours: number;
    isWeekend: boolean;
    isSaturday: boolean;
    isTradingSunday: boolean;
    minSaturdaysAmongAvailable: number;
    minSundaysAmongAvailable: number;
    avgDayStaffing: number;
    // New Global Stats for Dynamic Balancing
    globalShiftCounts: {
        morning: number;
        afternoon: number;
        evening: number;
        total: number;
    };
    globalStartTimeCounts: Map<string, number>; // "HH:MM" -> total count across all employees
    totalEmployees: number; // To calculate averages if needed
    dailyStaffing: Map<string, GeneratedShift[]>;
    quarterlyHistory?: QuarterlyShiftHistory;
    // Mapa przypisań szablonów do pracowników
    templateAssignmentsMap?: Map<string, string[]>;
}

export class CandidateScorer {
    /**
     * Główna metoda obliczająca score
     */
    calculateScore(context: ScoringContext): number {
        let score = 0;

        // NAJWYŻSZY PRIORYTET: Pracownicy z przypisanymi szablonami
        score += this.scoreAssignedTemplatePriority(context);

        score += this.scoreHoursMatch(context);
        score += this.scoreWeekendDistribution(context);
        score += this.scorePreferences(context);
        score += this.scoreShiftTypeBalance(context);
        score += this.scoreStartTimeBalance(context); // New granular balancing
        score += this.scoreQuarterlyBalance(context);
        score += this.scoreDayStaffing(context);
        score += this.scoreTemplateContinuity(context);

        // Bonus za równomierne rozłożenie szablonów u pracownika z przypisaniami
        score += this.scoreAssignedTemplateBalance(context);

        return score;
    }

    /**
     * PRIORYTET: Pracownicy z przypisanymi szablonami mają pierwszeństwo
     * Jeśli pracownik ma przypisane tylko kilka szablonów (specjalista),
     * daj mu ogromny bonus dla tych zmian.
     */
    private scoreAssignedTemplatePriority(ctx: ScoringContext): number {
        const assignmentsMap = ctx.templateAssignmentsMap;
        if (!assignmentsMap) return 0;

        const templateId = ctx.template.id;
        const assignedEmployees = assignmentsMap.get(templateId) || [];

        // Jeśli szablon nie ma przypisanych pracowników - brak modyfikacji
        if (assignedEmployees.length === 0) return 0;

        const isAssignedToThisTemplate = assignedEmployees.includes(
            ctx.state.emp.id,
        );

        if (isAssignedToThisTemplate) {
            // Ten pracownik jest przypisany do tego szablonu
            // Im mniej szablonów ma przypisanych, tym większy bonus (specjalista)
            const numAssignedTemplates = ctx.state.availableTemplates.length;

            // Jeśli ma tylko 1-2 szablony - ogromny priorytet
            if (numAssignedTemplates <= 2) {
                return SCORING_CONFIG.ASSIGNED_TEMPLATE.PRIORITY_VERY_HIGH; // Mega bonus
            } else if (numAssignedTemplates <= 4) {
                return SCORING_CONFIG.ASSIGNED_TEMPLATE.PRIORITY_HIGH; // Duży bonus
            } else {
                return SCORING_CONFIG.ASSIGNED_TEMPLATE.PRIORITY_STANDARD; // Standardowy bonus
            }
        } else {
            // Ten pracownik NIE jest przypisany do tego szablonu,
            // ale szablon ma przypisanych innych pracowników
            // Daj karę, żeby nie "kraść" zmian specjalistom
            return SCORING_CONFIG.ASSIGNED_TEMPLATE.NOT_ASSIGNED_PENALTY;
        }
    }

    /**
     * Równomierne rozłożenie zmian między przypisanymi szablonami
     * Dla pracownika z 2 przypisanymi szablonami - powinien mieć 50/50
     */
    private scoreAssignedTemplateBalance(ctx: ScoringContext): number {
        const numAvailableTemplates = ctx.state.availableTemplates.length;

        // Tylko dla pracowników z ograniczoną liczbą szablonów (specjaliści)
        if (numAvailableTemplates === 0 || numAvailableTemplates > 4) return 0;

        // Policz ile zmian pracownik ma z każdego swojego szablonu
        const templateCounts = new Map<string, number>();
        for (const t of ctx.state.availableTemplates) {
            templateCounts.set(t.id, 0);
        }

        for (const shift of ctx.state.shifts) {
            if (shift.template_id && templateCounts.has(shift.template_id)) {
                templateCounts.set(
                    shift.template_id,
                    (templateCounts.get(shift.template_id) || 0) + 1,
                );
            }
        }

        const currentTemplateCount = templateCounts.get(ctx.template.id) || 0;
        const totalShifts = ctx.state.shifts.length;

        if (totalShifts === 0) {
            return SCORING_CONFIG.ASSIGNED_TEMPLATE.FIRST_SHIFT_BONUS; // Bonus dla pierwszej zmiany
        }

        // Oblicz idealną liczbę zmian per szablon
        const idealCountPerTemplate = totalShifts / numAvailableTemplates;

        // Jeśli ten szablon ma mniej zmian niż średnia - bonus
        // Jeśli ma więcej - kara
        const deviation = currentTemplateCount - idealCountPerTemplate;

        if (deviation < -0.5) {
            // Ten szablon jest niedoreprezentowany - duży bonus
            return (
                Math.abs(deviation) *
                SCORING_CONFIG.ASSIGNED_TEMPLATE.BALANCE_BONUS
            );
        } else if (deviation > 0.5) {
            // Ten szablon jest nadreprezentowany - kara
            return (
                -deviation * SCORING_CONFIG.ASSIGNED_TEMPLATE.BALANCE_PENALTY
            );
        }

        return 0;
    }

    /**
     * KRYTYCZNE: Celuj w dokładnie wymagane godziny
     */
    private scoreHoursMatch(ctx: ScoringContext): number {
        const currentDeficit = ctx.state.requiredHours - ctx.state.currentHours;
        const afterShiftHours = ctx.state.currentHours + ctx.templateHours;
        const afterShiftDeficit = ctx.state.requiredHours - afterShiftHours;

        if (currentDeficit <= 0) {
            return SCORING_CONFIG.HOURS.ALREADY_MET_PENALTY; // Już ma wymagane godziny
        }

        if (afterShiftHours > ctx.state.requiredHours) {
            return SCORING_CONFIG.HOURS.OVERTIME_PENALTY; // Przekroczenie
        }

        let score = 0;

        if (Math.abs(afterShiftDeficit) <= 0.5) {
            score = SCORING_CONFIG.HOURS.PERFECT_MATCH; // IDEALNE dopasowanie
        } else if (afterShiftDeficit > 0 && afterShiftDeficit <= 2) {
            score = SCORING_CONFIG.HOURS.NEAR_MATCH; // Bardzo blisko
        } else if (afterShiftDeficit > 0 && afterShiftDeficit <= 4) {
            score = SCORING_CONFIG.HOURS.CLOSE_MATCH; // Blisko
        } else {
            score = currentDeficit * SCORING_CONFIG.HOURS.DEFICIT_MULTIPLIER; // Proporcjonalnie do deficytu
        }

        // NOWA LOGIKA: Sprawdź czy po tej zmianie pracownik będzie
        // mógł jeszcze dokładnie dopasować godziny innymi zmianami
        const remainingAfter = ctx.state.requiredHours - afterShiftHours;
        if (remainingAfter > 0) {
            // Sprawdź czy są dostępne szablony które pasują do pozostałego deficytu
            const hasMatchingTemplate = ctx.state.availableTemplates.some(
                (t) => {
                    const hours = getTemplateHours(t);
                    return Math.abs(hours - remainingAfter) <= 1;
                },
            );
            if (hasMatchingTemplate) {
                // BONUS - można później idealnie dopasować
                score += SCORING_CONFIG.HOURS.FUTURE_MATCH_BONUS;
            }
        }

        return score;
    }

    /**
     * NAJWYŻSZY PRIORYTET: Równomierny rozkład sobót/niedziel
     */
    private scoreWeekendDistribution(ctx: ScoringContext): number {
        let score = 0;

        if (ctx.isSaturday) {
            if (ctx.state.saturdayShiftCount > ctx.minSaturdaysAmongAvailable) {
                const diff =
                    ctx.state.saturdayShiftCount -
                    ctx.minSaturdaysAmongAvailable;
                score -= diff * SCORING_CONFIG.WEEKEND.SATURDAY_MAX_PENALTY; // Duża kara
            }
            score -=
                ctx.state.saturdayShiftCount *
                SCORING_CONFIG.WEEKEND.SATURDAY_PENALTY;
        }

        if (ctx.isTradingSunday) {
            if (ctx.state.sundayShiftCount > ctx.minSundaysAmongAvailable) {
                const diff =
                    ctx.state.sundayShiftCount - ctx.minSundaysAmongAvailable;
                score -= diff * SCORING_CONFIG.WEEKEND.SUNDAY_MAX_PENALTY; // Duża kara
            }
            score -=
                ctx.state.sundayShiftCount *
                SCORING_CONFIG.WEEKEND.SUNDAY_PENALTY;
        }

        if (ctx.isWeekend) {
            score -=
                ctx.state.weekendShiftCount *
                SCORING_CONFIG.WEEKEND.WEEKEND_PENALTY;
        }

        return score;
    }

    /**
     * Bonus za preferowane dni
     */
    private scorePreferences(ctx: ScoringContext): number {
        const prefs = ctx.state.emp.preferences;
        if (!prefs) return 0;

        const dayOfWeek = getDayOfWeek(ctx.date);
        const preferredDaysNums =
            prefs.preferred_days?.map((d) => Number(d)) || [];

        return preferredDaysNums.includes(dayOfWeek)
            ? SCORING_CONFIG.PREFERENCES.PREFERRED_DAY
            : 0;
    }

    /**
     * Balans rano/popołudnie/wieczór (Relatywny do całej grupy)
     * Zastępuje stare podejście promujące sztywne 1/3
     */
    private scoreShiftTypeBalance(ctx: ScoringContext): number {
        const timeType = getShiftTimeType(ctx.template.start_time);

        // Oblicz udział typów zmian dla pracownika (0.0 - 1.0)
        // Zapobiegamy dzieleniu przez zero - dodajemy 1 do mianownika (hipotetyczny start)
        // Albo po prostu jeśli totalShifts=0 to udział jest 0.

        const empTotal =
            ctx.state.morningShiftCount +
            ctx.state.afternoonShiftCount +
            ctx.state.eveningShiftCount;
        if (empTotal === 0)
            return SCORING_CONFIG.SHIFT_TYPE_BALANCE.KICKSTART_BONUS; // Preferuj pracowników bez zmian (kickstart) - ale to też robi step1

        // GLOBAL STATISTICS (What IS the actual distribution?)
        // Jeśli w całej firmie 60% zmian to rano, to każdy powinien mieć ok 60% rano.
        let globalTotal = ctx.globalShiftCounts.total;
        if (globalTotal === 0) globalTotal = 1;

        const globalShareM = ctx.globalShiftCounts.morning / globalTotal;
        const globalShareA = ctx.globalShiftCounts.afternoon / globalTotal;
        const globalShareE = ctx.globalShiftCounts.evening / globalTotal;

        // EMPLOYEE STATISTICS
        const empShareM = ctx.state.morningShiftCount / empTotal;
        const empShareA = ctx.state.afternoonShiftCount / empTotal;
        const empShareE = ctx.state.eveningShiftCount / empTotal;

        let score = 0;

        // Compare Employee Share vs Global Share
        // If I have MORE than my share of Mornings, penalize adding another Morning.
        // If I have LESS, reward adding Morning.

        let offset = 0;
        if (timeType === "morning") {
            offset = empShareM - globalShareM;
        } else if (timeType === "afternoon") {
            offset = empShareA - globalShareA;
        } else {
            offset = empShareE - globalShareE;
        }

        // Offset > 0 means I assume more load of this type than average -> Penalty
        // Offset < 0 means I assume less load -> Bonus

        // Skala: offset=0.1 (10% odchylenia).
        // 10% odchylenia to sporo? Przy 20 zmianach to 2 zmiany.

        if (offset > 0.05) {
            // Mam o 5% więcej tego typu niż średnia.
            // Kara powinna być dotkliwa.
            score -=
                offset *
                SCORING_CONFIG.SHIFT_TYPE_BALANCE.DOMINANCE_PENALTY_HARD;
        } else if (offset < -0.05) {
            // Mam o 5% mniej. Bonus.
            score +=
                Math.abs(offset) *
                SCORING_CONFIG.SHIFT_TYPE_BALANCE.MINORITY_BONUS;
        }

        // Dodatkowa kara za "Dominację" jednego typu u pracownika (np. >60% to same ranki, jeśli globalnie jest 30%)
        // Chociaż powyższa logika 'offset' to pokrywa.

        return score;
    }

    /**
     * Balans Konkretnych Godzin Rozpoczęcia (Granular Balancing)
     * Zapobiega sytuacji, gdzie "Rano" jest wyrównane, ale jedna osoba ma same 04:00, a druga same 08:00
     */
    private scoreStartTimeBalance(ctx: ScoringContext): number {
        const startTime = ctx.template.start_time;
        // Uprość start time do HH:MM (ignory seconds)
        const timeKey = startTime.slice(0, 5);

        // Policz ile razy pracownik miał już ten start time
        let employeeCount = 0;
        ctx.state.shifts.forEach((s) => {
            if (s.start_time.startsWith(timeKey)) employeeCount++;
        });

        const employeeTotalShifts = ctx.state.shifts.length;
        if (employeeTotalShifts === 0) return 0;

        // Udział procentowy tego start time u pracownika
        const employeeShare = employeeCount / employeeTotalShifts;

        // Udział procentowy tego start time w CAŁEJ FIRMIE
        const globalTotalShifts = ctx.globalShiftCounts.total || 1;
        const globalCount = ctx.globalStartTimeCounts.get(timeKey) || 0;
        const globalShare = globalCount / globalTotalShifts;

        // Oblicz odchylenie
        // Jeśli globalShare = 20% (co piąta zmiana w firmie to 04:00)
        // A employeeShare = 50% (połowa zmian pracownika to 04:00)
        // Offset = 0.3 (30%) -> Duża kara

        const offset = employeeShare - globalShare;

        let score = 0;

        if (offset > 0.1) {
            // Ponad 10% odchylenia od normy zakładowej
            score -=
                offset * SCORING_CONFIG.START_TIME_BALANCE.DOMINANCE_PENALTY;
        } else if (offset < -0.1) {
            // Jeśli ktoś ma za mało tej konkretnej godziny, daj mu szansę
            score +=
                Math.abs(offset) *
                SCORING_CONFIG.START_TIME_BALANCE.MINORITY_BONUS;
        }

        // Dodatkowy mechanizm "Absolutnego limitu powtórzeń"
        // Jeśli pracownik ma już bardzo dużo tej samej godziny (np. > 10 razy w miesiącu)
        // I chce wziąć kolejną - kara progresywna.
        if (employeeCount > SCORING_CONFIG.START_TIME_BALANCE.MAX_REPETITIONS) {
            score -=
                (employeeCount -
                    SCORING_CONFIG.START_TIME_BALANCE.MAX_REPETITIONS) *
                SCORING_CONFIG.START_TIME_BALANCE.REPETITION_PENALTY;
        }

        return score;
    }

    /**
     * Wyrównanie kwartalne (jeśli jest historia)
     */
    private scoreQuarterlyBalance(ctx: ScoringContext): number {
        if (!ctx.quarterlyHistory) return 0;

        let score = 0;

        // 1. Balans typów zmian w kwartale
        score += this.scoreQuarterlyShiftTypes(ctx);

        // 2. Wyrównanie liczby zmian między pracownikami
        score += this.scoreQuarterlyShiftCount(ctx);

        return score;
    }

    private scoreQuarterlyShiftTypes(ctx: ScoringContext): number {
        const avgTypes = ctx.quarterlyHistory!.averageShiftTypes;
        const timeType = getShiftTimeType(ctx.template.start_time);

        const totalMorning =
            ctx.state.quarterlyShiftTypes.morning + ctx.state.morningShiftCount;
        const totalAfternoon =
            ctx.state.quarterlyShiftTypes.afternoon +
            ctx.state.afternoonShiftCount;
        const totalEvening =
            ctx.state.quarterlyShiftTypes.evening + ctx.state.eveningShiftCount;

        const morningDeficit = avgTypes.morning - totalMorning;
        const afternoonDeficit = avgTypes.afternoon - totalAfternoon;
        const eveningDeficit = avgTypes.evening - totalEvening;

        let score = 0;

        // EKSTRYMALNY PRIORYTET DLA WYRÓWNANIA KWARTALNEGO
        // Wagi zwiększone 10-krotnie, aby przebić preferencje czy balans miesięczny

        // Bonus za kompensację deficytu
        if (timeType === "morning" && morningDeficit > 0)
            score +=
                morningDeficit *
                SCORING_CONFIG.QUARTERLY.DEFICIT_BONUS_MULTIPLIER;
        else if (timeType === "afternoon" && afternoonDeficit > 0)
            score +=
                afternoonDeficit *
                SCORING_CONFIG.QUARTERLY.DEFICIT_BONUS_MULTIPLIER;
        else if (timeType === "evening" && eveningDeficit > 0)
            score +=
                eveningDeficit *
                SCORING_CONFIG.QUARTERLY.DEFICIT_BONUS_MULTIPLIER;

        // Kara za pogłębianie nierównowagi (jeśli mam już za dużo zmian tego typu)
        // Deficit < 0 oznacza nadmiar.
        if (timeType === "morning" && morningDeficit < -1)
            score +=
                morningDeficit *
                SCORING_CONFIG.QUARTERLY.IMBALANCE_PENALTY_MULTIPLIER;
        // morningDeficit jest ujemne, więc to odejmie punkty
        else if (timeType === "afternoon" && afternoonDeficit < -1)
            score +=
                afternoonDeficit *
                SCORING_CONFIG.QUARTERLY.IMBALANCE_PENALTY_MULTIPLIER;
        else if (timeType === "evening" && eveningDeficit < -1)
            score +=
                eveningDeficit *
                SCORING_CONFIG.QUARTERLY.IMBALANCE_PENALTY_MULTIPLIER;

        return score;
    }

    private scoreQuarterlyShiftCount(ctx: ScoringContext): number {
        const avgShifts = ctx.quarterlyHistory!.averageShifts;
        const avgHours = ctx.quarterlyHistory!.averageHours;

        const totalShifts =
            ctx.state.quarterlyShiftCount + ctx.state.shifts.length;
        const totalHours = ctx.state.quarterlyHours + ctx.state.currentHours;

        const shiftDeficit = avgShifts - totalShifts;
        const hoursDeficit = avgHours - totalHours;

        let score = 0;

        // Zwiększone wagi za brakujące zmiany/godziny względem średniej kwartalnej
        if (shiftDeficit > 0)
            score +=
                shiftDeficit * SCORING_CONFIG.QUARTERLY.SHIFT_DEFICIT_BONUS;
        else if (shiftDeficit < 0)
            score +=
                shiftDeficit * SCORING_CONFIG.QUARTERLY.SHIFT_SURPLUS_PENALTY;

        if (hoursDeficit > 0)
            score +=
                hoursDeficit * SCORING_CONFIG.QUARTERLY.HOURS_DEFICIT_BONUS;
        else if (hoursDeficit < 0)
            score +=
                hoursDeficit * SCORING_CONFIG.QUARTERLY.HOURS_SURPLUS_PENALTY;

        return score;
    }

    /**
     * Równomierna obsada dni
     */
    private scoreDayStaffing(ctx: ScoringContext): number {
        const dayStaffing = ctx.dailyStaffing.get(ctx.date)?.length || 0;

        if (dayStaffing > ctx.avgDayStaffing + 1) {
            return (
                -(dayStaffing - ctx.avgDayStaffing) *
                SCORING_CONFIG.DAY_STAFFING.OVER_STAFFING_PENALTY
            );
        }

        if (dayStaffing < ctx.avgDayStaffing - 1) {
            return (
                (ctx.avgDayStaffing - dayStaffing) *
                SCORING_CONFIG.DAY_STAFFING.UNDER_STAFFING_BONUS
            );
        }

        return 0;
    }

    /**
     * Ciągłość szablonu
     */
    private scoreTemplateContinuity(ctx: ScoringContext): number {
        if (
            ctx.state.lastShiftTemplate?.id === ctx.template.id &&
            ctx.state.consecutiveShiftDays < 4
        ) {
            return SCORING_CONFIG.CONTINUITY.TEMPLATE_CONTINUITY_BONUS;
        }
        return 0;
    }
}

export const candidateScorer = new CandidateScorer();
