/**
 * =============================================================================
 * POLSKI KODEKS PRACY - CENTRALNY PLIK KONFIGURACYJNY
 * =============================================================================
 *
 * Wszystkie wartości związane z polskim prawem pracy w jednym miejscu.
 * Zmiana wartości tutaj automatycznie propaguje się na cały projekt.
 *
 * ŹRÓDŁO: Ustawa z dnia 26 czerwca 1974 r. - Kodeks pracy (Dz.U. 1974 Nr 24 poz. 141)
 * Stan prawny: obowiązujący
 */

// =============================================================================
// PODSTAWOWE LIMITY CZASU PRACY
// =============================================================================

/**
 * Art. 129 § 1 KP
 * Czas pracy nie może przekraczać 8 godzin na dobę i przeciętnie 40 godzin
 * w przeciętnie pięciodniowym tygodniu pracy w przyjętym okresie rozliczeniowym.
 */
export const MAX_DAILY_WORK_HOURS = 12;

/**
 * Art. 129 § 1 KP
 * Przeciętnie 40 godzin w przeciętnie pięciodniowym tygodniu pracy.
 */
export const MAX_WEEKLY_WORK_HOURS = 40;

/**
 * Art. 131 § 1 KP
 * Czas pracy łącznie z godzinami nadliczbowymi nie może przekraczać 48 godzin
 * w tygodniu w przyjętym okresie rozliczeniowym.
 */
export const MAX_WEEKLY_WORK_HOURS_WITH_OVERTIME = 48;

// =============================================================================
// ODPOCZYNEK
// =============================================================================

/**
 * Art. 132 § 1 KP
 * Pracownikowi przysługuje w każdej dobie prawo do co najmniej
 * 11 godzin nieprzerwanego odpoczynku.
 */
export const MIN_DAILY_REST_HOURS = 11;

/**
 * Art. 133 § 1 KP
 * Pracownikowi przysługuje w każdym tygodniu prawo do co najmniej
 * 35 godzin nieprzerwanego odpoczynku, obejmującego co najmniej 11 godzin
 * nieprzerwanego odpoczynku dobowego.
 */
export const MIN_WEEKLY_REST_HOURS = 35;

/**
 * Art. 151⁷ KP - Definicja pory nocnej
 * Pora nocna obejmuje 8 godzin między godzinami 21:00 a 7:00.
 * Konkretny przedział 8 kolejnych godzin ustala pracodawca w regulaminie pracy
 * lub w obwieszczeniu (jeśli nie ma obowiązku ustalenia regulaminu).
 *
 * Poniższe wartości to przedział ustawowy, NIE konkretne godziny pracy nocnej.
 */
export const NIGHT_SHIFT_MIN_START = 21;
export const NIGHT_SHIFT_MAX_END = 7;
export const NIGHT_SHIFT_DURATION_HOURS = 8;

// =============================================================================
// DNI PRACY I DNI WOLNE
// =============================================================================

/**
 * ⚠️ UWAGA PRAWNA: Kodeks pracy NIE określa maksymalnej liczby kolejnych dni pracy.
 *
 * Jedyne ustawowe ograniczenia to:
 * - Art. 132 KP: min. 11h odpoczynku dobowego
 * - Art. 133 KP: min. 35h odpoczynku tygodniowego (w tym 11h nieprzerwane)
 *
 * Oznacza to, że pracownik MOŻE pracować 6, 7, 8 lub więcej dni z rzędu,
 * o ile zapewniony jest odpoczynek tygodniowy w innym momencie okresu rozliczeniowego
 * (np. w systemach równoważnych, przy zmianach nocnych, w ochronie zdrowia).
 *
 * Poniższa wartość to POLITYKA FIRMY / HEURYSTYKA dla algorytmu, NIE PRAWO.
 */
export const RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS = 6;

/**
 * Art. 151 § 1 KP
 * Praca wykonywana ponad obowiązujące pracownika normy czasu pracy,
 * a także praca wykonywana ponad przedłużony dobowy wymiar czasu pracy,
 * wynikający z obowiązującego pracownika systemu i rozkładu czasu pracy,
 * stanowi pracę w godzinach nadliczbowych.
 */

// =============================================================================
// NADGODZINY
// =============================================================================

/**
 * Art. 151 § 3 KP
 * Liczba godzin nadliczbowych przepracowanych w związku z okolicznościami
 * określonymi w § 1 pkt 1 i 3 nie może przekroczyć dla poszczególnego
 * pracownika 150 godzin w roku kalendarzowym.
 */
export const MAX_OVERTIME_HOURS_PER_YEAR = 150;

/**
 * ⚠️ HEURYSTYKA: Szacowany tygodniowy limit nadgodzin
 * NIE JEST TO PRZEPIS KODEKSU PRACY.
 *
 * Art. 131 § 1 KP wymaga, aby ŚREDNIO w okresie rozliczeniowym czas pracy
 * nie przekraczał 48h/tydzień. W pojedynczym tygodniu może być więcej nadgodzin,
 * o ile średnia za okres rozliczeniowy się zgadza.
 *
 * Ta wartość służy algorytmom jako heurystyka wyrównywania obciążenia.
 */
export const RECOMMENDED_WEEKLY_OVERTIME_HOURS = 8;

/**
 * ⚠️ HEURYSTYKA: Dzienny limit nadgodzin (POLITYKA FIRMY, NIE KP)
 * Wynika z praktyki BHP i regulaminów wewnętrznych, nie z Kodeksu pracy.
 */
export const RECOMMENDED_DAILY_OVERTIME_HOURS = 2;

// =============================================================================
// PRZERWY W PRACY
// =============================================================================

/**
 * Art. 134 KP
 * Jeżeli doba pracy wynosi co najmniej 6 godzin, pracownik ma prawo
 * do przerwy w pracy trwającej co najmniej 15 minut.
 */
export const MIN_BREAK_FOR_6H_SHIFT = 15; // minuty

/**
 * Rekomendowana przerwa dla zmian 8-godzinnych
 */
export const RECOMMENDED_BREAK_FOR_8H_SHIFT = 30; // minuty

// =============================================================================
// OKRESY ROZLICZENIOWE
// =============================================================================

/**
 * Art. 129 § 2 KP
 * Okres rozliczeniowy nie może być dłuższy niż 4 miesiące.
 * Może być przedłużony maksymalnie do 12 miesięcy.
 */
export const MAX_SETTLEMENT_PERIOD_MONTHS = 4;
export const MAX_EXTENDED_SETTLEMENT_PERIOD_MONTHS = 12;

// =============================================================================
// TOLERANCJE I BUFOR (PRAKTYKA)
// =============================================================================

/**
 * Tolerancja dla przekroczeń godzinowych (nie wynikająca z KP)
 * Używana w algorytmach do unikania "sztywnych" limitów
 */
export const HOURS_TOLERANCE = 2;

/**
 * Próg znaczącego deficytu godzin
 */
export const SIGNIFICANT_HOURS_DEFICIT = 2;

/**
 * Próg znaczącej nadwyżki godzin
 */
export const SIGNIFICANT_HOURS_SURPLUS = 2;

// =============================================================================
// OBIEKT GŁÓWNY - POLSKI KODEKS PRACY
// =============================================================================

/**
 * Główny obiekt zawierający wszystkie reguły Kodeksu Pracy.
 * Używaj tego obiektu w całym projekcie do spójności.
 *
 * @example
 * ```ts
 * import { POLISH_LABOR_CODE } from '@/lib/constants/labor-code';
 *
 * if (restHours < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS) {
 *   // naruszenie odpoczynku dobowego
 * }
 * ```
 */
export const POLISH_LABOR_CODE = {
    // =========================================================================
    // TWARDY KODEKS PRACY (przepisy ustawowe)
    // =========================================================================

    // Czas pracy (Art. 129, 131 KP)
    MAX_DAILY_WORK_HOURS,
    MAX_WEEKLY_WORK_HOURS,
    MAX_WEEKLY_WORK_HOURS_WITH_OVERTIME,

    // Odpoczynek (Art. 132, 133 KP)
    MIN_DAILY_REST_HOURS,
    MIN_WEEKLY_REST_HOURS,

    // Pora nocna (Art. 151⁷ KP)
    NIGHT_SHIFT_MIN_START,
    NIGHT_SHIFT_MAX_END,
    NIGHT_SHIFT_DURATION_HOURS,
    // Aliasy dla kompatybilności wstecznej
    NIGHT_SHIFT_START_HOUR: NIGHT_SHIFT_MIN_START,
    NIGHT_SHIFT_END_HOUR: NIGHT_SHIFT_MAX_END,

    // Nadgodziny (Art. 151 KP)
    MAX_OVERTIME_HOURS_PER_YEAR,

    // Przerwy (Art. 134 KP)
    MIN_BREAK_FOR_6H_SHIFT,

    // Okresy rozliczeniowe (Art. 129 §2 KP)
    MAX_SETTLEMENT_PERIOD_MONTHS,
    MAX_EXTENDED_SETTLEMENT_PERIOD_MONTHS,

    // =========================================================================
    // POLITYKA FIRMY / HEURYSTYKI (NIE SĄ PRZEPISAMI KP)
    // =========================================================================

    // Dni pracy z rzędu (brak limitu w KP, to polityka firmy)
    RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS,
    // Alias dla kompatybilności wstecznej
    MAX_CONSECUTIVE_WORK_DAYS: RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS,

    // Nadgodziny (heurystyki dla algorytmu)
    RECOMMENDED_WEEKLY_OVERTIME_HOURS,
    RECOMMENDED_DAILY_OVERTIME_HOURS,
    // Aliasy dla kompatybilności wstecznej
    MAX_WEEKLY_OVERTIME_HOURS: RECOMMENDED_WEEKLY_OVERTIME_HOURS,
    MAX_DAILY_OVERTIME_HOURS: RECOMMENDED_DAILY_OVERTIME_HOURS,

    // Przerwy (rekomendacje)
    RECOMMENDED_BREAK_FOR_8H_SHIFT,

    // Tolerancje (praktyka algorytmiczna)
    HOURS_TOLERANCE,
    SIGNIFICANT_HOURS_DEFICIT,
    SIGNIFICANT_HOURS_SURPLUS,
} as const;

// =============================================================================
// TYPY
// =============================================================================

/**
 * Typ dla obiektu POLISH_LABOR_CODE
 */
export type PolishLaborCode = typeof POLISH_LABOR_CODE;

/**
 * Klucze dostępne w POLISH_LABOR_CODE
 */
export type LaborCodeKey = keyof PolishLaborCode;

// =============================================================================
// KOMUNIKATY BŁĘDÓW
// =============================================================================

/**
 * Standardowe komunikaty o naruszeniach Kodeksu Pracy
 */
export const LABOR_CODE_VIOLATION_MESSAGES = {
    DAILY_REST: `Brak ${MIN_DAILY_REST_HOURS}h przerwy między zmianami (Art. 132 KP)`,
    WEEKLY_HOURS: `Przekroczenie ${MAX_WEEKLY_WORK_HOURS_WITH_OVERTIME}h/tydzień (Art. 131 § 1 KP)`,
    CONSECUTIVE_DAYS: `Ponad ${RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS} dni pracy z rzędu`,
    DAILY_HOURS: `Przekroczenie ${MAX_DAILY_WORK_HOURS}h/dobę (Art. 129 § 1 KP)`,
    WEEKLY_REST: `Brak ${MIN_WEEKLY_REST_HOURS}h odpoczynku tygodniowego (Art. 133 KP)`,
    OVERTIME_YEARLY: `Przekroczenie limitu ${MAX_OVERTIME_HOURS_PER_YEAR}h nadgodzin rocznie (Art. 151 § 3 KP)`,
} as const;

/**
 * Linki do artykułów Kodeksu Pracy (dla dokumentacji)
 */
export const LABOR_CODE_REFERENCES = {
    ART_129:
        "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
    ART_132:
        "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
    ART_133:
        "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
    ART_134:
        "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
    ART_147:
        "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
    ART_151:
        "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141",
} as const;
