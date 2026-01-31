"""
Calenda Schedule - Konfiguracja Optymalizatora
==============================================
Wszystkie parametry i wagi używane przez CP-SAT solver.
Zmiana wartości w tym pliku wpływa na działanie algorytmu optymalizacyjnego.
"""

# =============================================================================
# PARAMETRY SOLVERA CP-SAT
# =============================================================================

class SolverConfig:
    """Konfiguracja Google OR-Tools CP-SAT solver"""
    
    # Maksymalny czas rozwiązywania w sekundach
    # Wyższe wartości = większa szansa na optymalne rozwiązanie, ale dłuższe oczekiwanie
    DEFAULT_TIME_LIMIT = 300  # 5 minut
    
    # Liczba wątków używanych przez solver
    # Więcej wątków = szybsze rozwiązywanie (wykorzystuje CPU)
    NUM_SEARCH_WORKERS = 8
    
    # Czy wyświetlać szczegółowy log postępu solvera
    # True = więcej informacji w konsoli, False = czystszy output
    LOG_SEARCH_PROGRESS = False


# =============================================================================
# PRIORYTETY SOFT CONSTRAINTS (cele optymalizacyjne)
# =============================================================================
# WAŻNE: Wyższe wartości = wyższy priorytet!
# Solver będzie bardziej starał się spełnić ograniczenia z wyższymi wagami.

class SoftConstraintWeights:
    """Wagi kar i nagród dla celów optymalizacyjnych"""
    
    # -------------------------------------------------------------------------
    # SC1: Wypełnienie godzin etatu (max_hours)
    # -------------------------------------------------------------------------
    # PRIORYTET 1 - Najważniejszy! Pracownicy muszą mieć odpowiednią liczbę godzin.
    
    # Kara za NIEDOPRACOWANIE godzin (5000 pkt za każdą brakującą godzinę)
    # Przykład: Pracownik ma 160h zamiast 176h → kara 16h × 5000 = 80,000 pkt
    SC1_PENALTY_UNDERSCHEDULE = 5000
    
    # Kara za NADPRACOWANIE godzin (100 pkt za każdą nadgodzinę)
    # Znacznie niższa niż niedopracowanie, bo HC10 i tak blokuje przekroczenie max_hours
    SC1_PENALTY_OVERSCHEDULE = 100
    
    # -------------------------------------------------------------------------
    # SC5: Sprawiedliwe rozłożenie weekendów
    # -------------------------------------------------------------------------
    # PRIORYTET 2 - 100% priorytet (z HC13 hard constraint!)
    # Każdy pracownik powinien pracować podobną liczbę sobót i niedziel handlowych
    
    # Kara za nierównomierne rozłożenie weekendów (5000 pkt za każdą zmianę weekendową odchylenia)
    # Przykład: Jan ma 4 zmiany weekendowe, Anna 2 zmiany → różnica 2 × 5000 = 10,000 pkt kary
    # BARDZO WYSOKA WAGA + HC13 wymusza max ±2 zmiany różnicy jako HARD CONSTRAINT!
    SC5_PENALTY_WEEKEND_DEVIATION = 5000
    
    # -------------------------------------------------------------------------
    # SC6: Równomierna obsada dzienna (±1 pracownik między dniami)
    # -------------------------------------------------------------------------
    # PRIORYTET 3 - Wysoki
    # Każdy dzień powinien mieć podobną liczbę pracowników na zmianach
    
    # Kara za nierównomierną obsadę dzienną (1500 pkt za każde odchylenie)
    # Przykład: Poniedziałek 5 osób, wtorek 8 osób → różnica 3 × 1500 = 4,500 pkt
    SC6_PENALTY_STAFFING_DEVIATION = 1500
    
    # -------------------------------------------------------------------------
    # SC7: Sprawiedliwe rozłożenie zmian miesięcznych
    # -------------------------------------------------------------------------
    # PRIORYTET 4 - 75% priorytet względem SC1
    # Wszyscy pracownicy mają podobną całkowitą liczbę zmian w miesiącu
    
    # Kara za nierównomierne zmiany miesięczne (500 pkt za każdą zmianę odchylenia)
    # Przykład: Jan 20 zmian w miesiącu, Anna 15 zmian → różnica 5 × 500 = 2,500 pkt
    SC7_PENALTY_MONTHLY_DEVIATION = 500
    
    # -------------------------------------------------------------------------
    # SC4: Ogólne równomierne rozłożenie zmian między pracowników
    # -------------------------------------------------------------------------
    # PRIORYTET 5 - Najniższy
    # Wszyscy pracownicy mają podobną całkowitą liczbę zmian w miesiącu
    
    # Kara za nierównomierne rozłożenie (10 pkt za każdą zmianę odchylenia)
    # Przykład: Jan 20 zmian, Anna 15 zmian → różnica 5 × 10 = 50 pkt
    SC4_PENALTY_SHIFT_DEVIATION = 10
    
    # -------------------------------------------------------------------------
    # SC2: Preferencje czasowe pracowników
    # -------------------------------------------------------------------------
    # Nagroda za zgodność z preferowanymi godzinami rozpoczęcia zmiany
    
    # Nagroda za zmianę zgodną z preferencjami (50 pkt za każdą zgodną zmianę)
    # Przykład: Pracownik preferuje 8:00, dostaje zmianę 8:00 → +50 pkt
    SC2_REWARD_PREFERENCE_MATCH = 50
    
    # Tolerancja godzinowa dla preferencji (w minutach)
    # ±60 minut = preferencja 8:00 akceptuje 7:00-9:00
    SC2_PREFERENCE_TOLERANCE_MINUTES = 60
    
    # -------------------------------------------------------------------------
    # SC3: Obecność managera na zmianach (mix kompetencji)
    # -------------------------------------------------------------------------
    # Premia za obecność osoby na stanowisku kierowniczym na każdej zmianie
    
    # Nagroda za obecność managera (200 pkt za każdą zmianę z managerem)
    # Przykład: Zmiana z managerem → +200 pkt, bez managera → 0 pkt
    SC3_REWARD_MANAGER_PRESENCE = 200


# =============================================================================
# HARD CONSTRAINTS - Wartości domyślne i limity
# =============================================================================

class HardConstraintDefaults:
    """Domyślne wartości dla ograniczeń twardych (jeśli brak w scheduling_rules)"""
    
    # HC2: Maksymalna liczba godzin pracy w tygodniu (Art. 131 § 1 KP)
    # 48h to maksimum prawne w Polsce
    MAX_WEEKLY_HOURS = 48
    
    # HC3: Minimalny odpoczynek dobowy (Art. 132 KP)
    # 11h to minimum prawne między zmianami
    MIN_DAILY_REST_HOURS = 11
    
    # HC4: Maksymalna liczba dni pracy pod rząd (Art. 133 KP)
    # 6 dni z rzędu to standard (7. dzień = odpoczynek)
    MAX_CONSECUTIVE_DAYS = 6
    
    # HC7: Minimalna liczba pracowników na zmianę (fallback)
    # Jeśli szablon i organization_settings nie definiują - użyj 1
    MIN_EMPLOYEES_PER_SHIFT = 1
    
    
    # HC10: Buffer dla maksymalnych godzin miesięcznie
    # 1.0 = dokładnie max_hours, 1.05 = +5% elastyczności
    # OBECNIE: buffer został usunięty, używamy dokładnie max_hours
    MAX_HOURS_BUFFER = 1.0
    
    # HC13: Maksymalna dozwolona różnica weekendów między pracownikami
    # KRYTYCZNE dla sprawiedliwego rozkładu weekendów!
    # Jeśli jest 5 sobót i 3 pracowników:
    #   - Idealnie: 2, 2, 1 (różnica max 1)
    #   - MAX_WEEKEND_DIFF = 2 pozwala: 3, 2, 0 lub 3, 1, 1
    #   - MAX_WEEKEND_DIFF = 1 wymusza: 2, 2, 1 (równiej)
    # Większa wartość = większa elastyczność, ale mniej sprawiedliwie
    MAX_WEEKEND_DIFF = 2


# =============================================================================
# OBLICZANIE JAKOŚCI ROZWIĄZANIA
# =============================================================================

class QualityMetrics:
    """Parametry do normalizacji wartości funkcji celu do quality_percent (0-100%)"""
    
    # Szacowana maksymalna wartość bonusu na zmianę
    # Suma wszystkich możliwych nagród (SC2 + SC3 + inne)
    # Używane do mapowania objective_value na 0-100%
    ESTIMATED_MAX_BONUS_PER_SHIFT = 300
    
    # Szacowana maksymalna kara na zmianę
    # Suma wszystkich możliwych kar (SC1 + SC4 + SC5 + SC6 + SC7)
    ESTIMATED_MAX_PENALTY_PER_SHIFT = 500


# =============================================================================
# DIAGNOSTYKA I INFEASIBILITY
# =============================================================================

class DiagnosticThresholds:
    """Progi do wykrywania problemów podczas diagnostyki niemożliwości rozwiązania"""
    
    # Próg stosunku nieobecności do wszystkich dni pracowniczych
    # Jeśli > 30% dni to nieobecności → warning o braku dostępności
    HIGH_ABSENCE_RATIO = 0.3
    
    # Próg dla bardzo restrykcyjnego max_consecutive_days
    # Jeśli < 5 dni → warning o zbyt małej elastyczności
    VERY_RESTRICTIVE_CONSECUTIVE_DAYS = 5
    
    # Buffer przy porównywaniu wymaganych vs dostępnych godzin
    # 1.2 = 20% tolerancji (jeśli wymagane > dostępne × 1.2 → problem)
    HOURS_COMPARISON_BUFFER = 1.2
    
    # Maksymalna liczba problemów wyświetlanych w diagnostyce
    # Ogranicza spam w konsoli (reszta to "... i X więcej")
    MAX_DISPLAYED_ISSUES = 5


# =============================================================================
# NORMY CZASOWE
# =============================================================================

class TimeNorms:
    """Standardowe normy czasu pracy (fallback gdy brak w danych)"""
    
    # Domyślna miesięczna norma godzin dla pełnego etatu
    # 160h = standardowy miesiąc, 176h = miesiąc z większą liczbą dni roboczych
    DEFAULT_MONTHLY_HOURS = 160
    
    # Domyślna długość zmiany w godzinach (fallback dla obliczeń urlopowych)
    # Używane gdy nie można obliczyć średniej z szablonów
    DEFAULT_SHIFT_DURATION_HOURS = 8.0
    
    # Mnożniki etatu dla różnych typów zatrudnienia
    # Używane do skalowania target_hours dla niepełnych etatów
    EMPLOYMENT_TYPE_MULTIPLIERS = {
        'full': 1.0,           # Pełny etat (100%)
        'three_quarter': 0.75, # 3/4 etatu (75%)
        'half': 0.5,           # 1/2 etatu (50%)
        'one_third': 0.333,    # 1/3 etatu (33.3%)
        'custom': 1.0          # Custom - custom_hours już zawiera proporcje
    }


# =============================================================================
# MAPOWANIE DNI TYGODNIA
# =============================================================================

class WeekdayMapping:
    """Mapowanie numerów dni tygodnia Python (0-6) na nazwy używane w API"""
    
    # Python datetime.weekday(): 0=Poniedziałek, 6=Niedziela
    WEEKDAY_TO_NAME = {
        0: 'monday',
        1: 'tuesday',
        2: 'wednesday',
        3: 'thursday',
        4: 'friday',
        5: 'saturday',
        6: 'sunday'
    }
    
    # Odwrotne mapowanie (nazwa → numer)
    NAME_TO_WEEKDAY = {v: k for k, v in WEEKDAY_TO_NAME.items()}


# =============================================================================
# SŁOWA KLUCZOWE DLA IDENTYFIKACJI MANAGERÓW
# =============================================================================

class ManagerKeywords:
    """Słowa kluczowe w position używane do identyfikacji managerów/kierowników"""
    
    # Lista słów w pozycji pracownika, które wskazują na stanowisko kierownicze
    # Używane do SC3 (mix kompetencji - obecność managera na zmianie)
    KEYWORDS = [
        'manager',
        'kierownik',
        'menedżer',
        'menadżer',
        'szef',
        'dyrektor'
    ]


# =============================================================================
# EKSPORT - łatwy dostęp do wszystkich konfiguracji
# =============================================================================

# Główne klasy konfiguracyjne
__all__ = [
    'SolverConfig',
    'SoftConstraintWeights',
    'HardConstraintDefaults',
    'QualityMetrics',
    'DiagnosticThresholds',
    'TimeNorms',
    'WeekdayMapping',
    'ManagerKeywords'
]
