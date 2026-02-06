"""
================================================================================
Calenda Schedule - CP-SAT Optimizer v4.0
================================================================================
Profesjonalny moduł do generowania miesięcznych grafików pracy.
Wykorzystuje Google OR-Tools CP-SAT Solver z hierarchiczną funkcją celu.

Autor: Senior Backend Developer
Wersja: 4.0.0
Data: 2026-02-04

ARCHITEKTURA HIERARCHII OGRANICZEŃ:
============================================================================
1. ZASADY TWARDE (Bezwzględne - model.Add):
   - Maksymalnie 1 zmiana dziennie na pracownika
   - Absolutny zakaz pracy w dni urlopu/nieobecności

2. PRIORYTET NR 1 (Funkcja Celu - Godziny):
   - Cel: 100% normy godzinowej
   - Kara za niedociągnięcie: 10,000,000 pkt za minutę poniżej normy
   - Bufor [Norma, Norma + 480 min]: koszt 0
   - Kara za przekroczenie bufora: 10,000,000 pkt za minutę powyżej

3. ZASADY MIĘKKIE (Niższy priorytet - zmienne slack):
   - Coverage: 100,000 pkt za brakującego pracownika (slack_under)
   - Kodeks Pracy (odpoczynek 11h/35h, 6 dni z rzędu): 10,000 pkt
   - Preferencje i sprawiedliwość: 100 pkt

KLUCZOWE CECHY:
- ZAWSZE zwraca FEASIBLE (nigdy INFEASIBLE)
- Obsługa mieszanych długości zmian (6h, 8h, 12h)
- Hierarchiczna funkcja celu gwarantuje prawidłowe priorytety
================================================================================
"""

from ortools.sat.python import cp_model
from typing import Dict, List, Tuple, Optional, Set, Any
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from calendar import monthrange
from collections import defaultdict
import time
import traceback


# =============================================================================
# STAŁE I KONFIGURACJA - HIERARCHIA WAG
# =============================================================================

# Mnożniki etatu względem pełnego etatu (40h/tydzień)
EMPLOYMENT_MULTIPLIERS: Dict[str, float] = {
    'full': 1.0,           # 40h/tydzień = 100% normy
    'three_quarter': 0.75, # 30h/tydzień = 75% normy
    'half': 0.5,           # 20h/tydzień = 50% normy
    'one_third': 0.333,    # ~13h/tydzień = 33% normy
    'custom': 1.0,         # Niestandardowy - obliczany z custom_hours
}

# =============================================================================
# HIERARCHIA WAG - KLUCZOWE DLA POPRAWNEGO DZIAŁANIA
# =============================================================================
# Wagi są dobrane tak, aby zachować ścisłą hierarchię:
# - Waga wyższego poziomu >> suma wszystkich wag niższych poziomów

WEIGHT_HIERARCHY = {
    # POZIOM 1: KRYTYCZNY - Godziny (10,000,000 pkt/min)
    # Kara za odchylenie od okna [Norma]
    'HOURS_UNDER_TARGET_PER_MINUTE': 20_000_000,   # Poniżej normy
    'HOURS_OVER_BUFFER_PER_MINUTE': 10_000_000,    # Powyżej Norma
    
    # POZIOM 2: COVERAGE - Obsada (100,000 pkt/os)
    'COVERAGE_SLACK_PER_PERSON': 500_000,          # Brak pracownika na zmianie
    
    # POZIOM 2.5: RÓWNOWAGA OBSADY DZIENNEJ (50,000 pkt)
    'DAILY_COVERAGE_BALANCE': 100,              # Wyrównanie obsady między zmianami w dniu
    
    # POZIOM 3: KODEKS PRACY - Miękkie (10,000 pkt)
    'DAILY_REST_VIOLATION': 10_000,                # Naruszenie 11h odpoczynku
    'WEEKLY_REST_VIOLATION': 100,               # Naruszenie 35h odpoczynku
    'CONSECUTIVE_DAYS_VIOLATION': 100,          # >6 dni z rzędu
    'MAX_WEEKLY_HOURS_VIOLATION': 100,          # >48h/tydzień
    
    # POZIOM 4: PREFERENCJE I SPRAWIEDLIWOŚĆ (100 pkt)
    'PREFERENCE_MATCH_BONUS': 110,                 # Bonus za zgodność
    'AVOIDED_DAY_PENALTY': 100,                    # Kara za niechciany dzień
    'WEEKEND_FAIRNESS_PENALTY': 200,               # Sprawiedliwe weekendy
    'SHIFT_DISTRIBUTION_PENALTY': 150,             # Równy rozkład zmian
    'SUNDAY_WORK_PENALTY': 100,                    # Praca w niedzielę
}

# Bufor godzin ponad normę (w minutach) - bez kary
# Pozwala na odchylenie +/- 8h od normy (480 minut)
HOURS_BUFFER_MINUTES = 0  # 8 godzin

# Limity Kodeksu Pracy (teraz jako soft constraints)
LABOR_CODE = {
    'MAX_WEEKLY_HOURS': 48,               # Art. 131 KP
    'MIN_DAILY_REST_HOURS': 11,           # Art. 132 KP
    'MIN_WEEKLY_REST_HOURS': 35,          # Art. 133 KP
    'MAX_CONSECUTIVE_DAYS': 6,            # Art. 133 KP
    'FREE_SUNDAY_INTERVAL': 4,            # Art. 151^10 KP
}


# =============================================================================
# COVERAGE CALCULATION - Obliczanie pokrycia godzin otwarcia
# =============================================================================

TIME_SLOT_MINUTES = 15

@dataclass
class TimeSlot:
    """Reprezentacja slotu czasowego do analizy pokrycia."""
    start_minutes: int
    end_minutes: int
    min_employees: int = 1
    
    @property
    def duration_minutes(self) -> int:
        return self.end_minutes - self.start_minutes


def parse_time_to_minutes(time_str: str, is_end_time: bool = False) -> int:
    """
    Konwertuje string czasu (HH:MM lub HH:MM:SS) na minuty od północy.
    
    Args:
        time_str: Czas w formacie HH:MM lub HH:MM:SS
        is_end_time: Czy to czas zakończenia (dla obsługi 24:00 i 00:00)
    
    Obsługa specjalnych przypadków:
    - 24:00 → 1440 (koniec dnia, używane jako end_time)
    - 00:00 jako end_time → 1440 (pełna doba, np. 00:00-00:00 = 24h)
    """
    if not time_str:
        return 0
    parts = time_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    
    total = hours * 60 + minutes
    
    # 24:00 = koniec dnia (1440 minut)
    if hours == 24:
        return 1440
    
    # 00:00 jako end_time = koniec dnia (pełna doba)
    if is_end_time and total == 0:
        return 1440
    
    return total


def get_day_name_from_weekday(weekday: int) -> str:
    """Konwertuje numer dnia tygodnia (0=Pn, 6=Nd) na nazwę po angielsku."""
    day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return day_names[weekday]


def calculate_coverage_slots(
    open_time: str,
    close_time: str,
    min_employees: int = 1,
    slot_duration: int = TIME_SLOT_MINUTES
) -> List[TimeSlot]:
    """Dzieli godziny otwarcia na sloty czasowe."""
    open_minutes = parse_time_to_minutes(open_time)
    close_minutes = parse_time_to_minutes(close_time)
    
    if close_minutes <= open_minutes:
        close_minutes += 24 * 60
    
    slots = []
    current = open_minutes
    while current < close_minutes:
        slot_end = min(current + slot_duration, close_minutes)
        slots.append(TimeSlot(
            start_minutes=current,
            end_minutes=slot_end,
            min_employees=min_employees
        ))
        current = slot_end
    
    return slots


def does_template_cover_slot(template, slot: TimeSlot) -> bool:
    """Sprawdza czy dany szablon zmiany pokrywa slot czasowy."""
    tmpl_start = parse_time_to_minutes(template.start_time)
    tmpl_end = parse_time_to_minutes(template.end_time)
    
    if tmpl_end <= tmpl_start:
        tmpl_end += 24 * 60
    
    return tmpl_start <= slot.start_minutes and tmpl_end >= slot.end_minutes


# =============================================================================
# DATA CLASSES - Struktury danych
# =============================================================================

@dataclass
class Employee:
    """Reprezentacja pracownika z wszystkimi danymi."""
    id: str
    first_name: str
    last_name: str
    employment_type: str
    max_hours: float
    custom_hours: Optional[float] = None
    is_active: bool = True
    is_supervisor: bool = False  # Kierownik/opiekun musi być zawsze na zmianie
    position: str = 'Pracownik'
    color: Optional[str] = None
    template_assignments: List[str] = field(default_factory=list)
    absence_days_count: int = 0
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def get_target_minutes(self, monthly_norm_minutes: int, work_days_count: int = 20) -> int:
        """
        Oblicza docelową liczbę minut pracy w miesiącu.
        Jeśli pracownik ma urlop, target jest proporcjonalnie zmniejszany.
        """
        if self.employment_type == 'custom' and self.custom_hours:
            ratio = self.custom_hours / 40.0
            base_target = int(monthly_norm_minutes * ratio)
        else:
            multiplier = EMPLOYMENT_MULTIPLIERS.get(self.employment_type, 1.0)
            base_target = int(monthly_norm_minutes * multiplier)
        
        if self.absence_days_count > 0 and work_days_count > 0:
            available_days = max(0, work_days_count - self.absence_days_count)
            availability_ratio = available_days / work_days_count
            adjusted_target = int(base_target * availability_ratio)
            return adjusted_target
        
        return base_target


@dataclass  
class ShiftTemplate:
    """Reprezentacja szablonu zmiany."""
    id: str
    name: str
    start_time: str
    end_time: str
    min_employees: int = 1
    max_employees: Optional[int] = None
    applicable_days: List[str] = field(default_factory=list)
    color: Optional[str] = None
    
    def get_duration_minutes(self) -> int:
        """
        Oblicza czas trwania zmiany w minutach.
        
        OBSŁUGA SPECJALNYCH PRZYPADKÓW:
        - 00:00-00:00 lub 00:00-24:00 = 24h (1440 min)
        - 19:00-07:00 = zmiana nocna = 12h (720 min)
        - 08:00-16:00 = zmiana dzienna = 8h (480 min)
        """
        start = self._parse_time(self.start_time, is_end_time=False)
        end = self._parse_time(self.end_time, is_end_time=True)
        
        # Jeśli end <= start (zmiana nocna), dodaj 24h
        if end <= start:
            end += 24 * 60
        
        return end - start
    
    def get_gross_duration_minutes(self) -> int:
        """
        Oblicza czas trwania zmiany w minutach (brutto).
        Identyczne z get_duration_minutes (przerwy usunięte).
        """
        return self.get_duration_minutes()
    
    def _parse_time(self, time_str: str, is_end_time: bool = False) -> int:
        """
        Parsuje czas HH:MM lub HH:MM:SS do minut od północy.
        
        Args:
            time_str: Czas w formacie HH:MM
            is_end_time: Czy to czas zakończenia (dla 24:00/00:00)
        """
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        
        total = hours * 60 + minutes
        
        # 24:00 = koniec dnia
        if hours == 24:
            return 1440
        
        # 00:00 jako end_time = koniec dnia (pełna doba)
        if is_end_time and total == 0:
            return 1440
        
        return total
    
    def get_start_minutes(self) -> int:
        """Zwraca czas rozpoczęcia jako minuty od północy (0-1439)."""
        return self._parse_time(self.start_time)
    
    def get_end_minutes(self) -> int:
        """
        Zwraca czas zakończenia jako minuty od północy.
        
        Dla zmian nocnych zwraca wartość > 1440 (np. 07:00 następnego dnia = 1860).
        To pozwala poprawnie obliczyć czas trwania i odpoczynek między zmianami.
        """
        end = self._parse_time(self.end_time, is_end_time=True)
        start = self._parse_time(self.start_time, is_end_time=False)
        if end <= start:
            end += 24 * 60  # Kończy się następnego dnia
        return end
    
    def is_night_shift(self) -> bool:
        """
        Sprawdza czy zmiana jest nocna (przechodzi przez północ).
        Przykład: 19:00-07:00 jest zmianą nocną, 08:00-16:00 nie jest.
        Uwaga: 00:00-24:00 NIE jest zmianą nocną (pełna doba w tym samym dniu).
        """
        start = self._parse_time(self.start_time, is_end_time=False)
        end = self._parse_time(self.end_time, is_end_time=True)
        return end <= start


@dataclass
class Absence:
    """Reprezentacja nieobecności pracownika."""
    employee_id: str
    start_date: str
    end_date: str
    absence_type: str
    
    def covers_date(self, date_str: str) -> bool:
        return self.start_date <= date_str <= self.end_date


@dataclass
class EmployeePreference:
    """Preferencje pracownika."""
    employee_id: str
    preferred_start_time: Optional[str] = None
    preferred_end_time: Optional[str] = None
    max_hours_per_week: Optional[int] = None
    max_hours_per_day: Optional[int] = None
    can_work_weekends: bool = True
    can_work_holidays: bool = True
    preferred_days: List[int] = field(default_factory=list)
    unavailable_days: List[int] = field(default_factory=list)


# =============================================================================
# DATA MODEL - Preprocessing danych wejściowych
# =============================================================================

class DataModel:
    """Klasa do preprocessingu i walidacji danych wejściowych."""
    
    def __init__(self, input_data: Dict):
        self.raw_data = input_data
        self.year: int = input_data.get('year', datetime.now().year)
        self.month: int = input_data.get('month', datetime.now().month)
        
        self._calculate_month_info()
        self._parse_employees()
        self._parse_templates()
        self._parse_absences()
        self._parse_preferences()
        self._parse_trading_sundays()
        self._parse_settings()
        self._build_indices()
        self._log_summary()
    
    def _calculate_month_info(self):
        """Oblicza informacje o dniach w miesiącu."""
        _, days_in_month = monthrange(self.year, self.month)
        self.days_in_month = days_in_month
        self.all_days: List[int] = list(range(1, days_in_month + 1))
        
        self.weekdays: List[int] = []
        self.saturdays: List[int] = []
        self.sundays: List[int] = []
        
        for day in self.all_days:
            d = date(self.year, self.month, day)
            weekday = d.weekday()
            
            if weekday < 5:
                self.weekdays.append(day)
            elif weekday == 5:
                self.saturdays.append(day)
            else:
                self.sundays.append(day)
        
        provided_norm = self.raw_data.get('monthly_hours_norm')
        if provided_norm:
            self.monthly_norm_hours = provided_norm
        else:
            self.monthly_norm_hours = len(self.weekdays) * 8
        
        self.monthly_norm_minutes = int(self.monthly_norm_hours * 60)
        
        print(f"📅 Miesiąc: {self.year}-{self.month:02d}")
        print(f"   Dni w miesiącu: {self.days_in_month}")
        print(f"   Dni robocze (Pn-Pt): {len(self.weekdays)}")
        print(f"   Norma miesięczna: {self.monthly_norm_hours}h ({self.monthly_norm_minutes} min)")
    
    def _parse_employees(self):
        """Parsuje listę pracowników."""
        self.employees: List[Employee] = []
        
        for emp_data in self.raw_data.get('employees', []):
            emp = Employee(
                id=emp_data.get('id', ''),
                first_name=emp_data.get('first_name', 'Unknown'),
                last_name=emp_data.get('last_name', ''),
                employment_type=emp_data.get('employment_type', 'full'),
                max_hours=emp_data.get('max_hours', self.monthly_norm_hours),
                custom_hours=emp_data.get('custom_hours'),
                is_active=emp_data.get('is_active', True),
                is_supervisor=emp_data.get('is_supervisor', False),
                position=emp_data.get('position', 'Pracownik'),
                color=emp_data.get('color'),
                template_assignments=emp_data.get('template_assignments', []),
                absence_days_count=0,
            )
            
            if emp.is_active:
                self.employees.append(emp)
        
        # Zlicz kierowników
        supervisor_count = sum(1 for emp in self.employees if emp.is_supervisor)
        print(f"👥 Pracownicy: {len(self.employees)} aktywnych ({supervisor_count} kierowników)")
    
    def _parse_templates(self):
        """Parsuje szablony zmian."""
        self.templates: List[ShiftTemplate] = []
        
        for tmpl_data in self.raw_data.get('shift_templates', []):
            tmpl = ShiftTemplate(
                id=tmpl_data.get('id', ''),
                name=tmpl_data.get('name', 'Zmiana'),
                start_time=tmpl_data.get('start_time', '08:00'),
                end_time=tmpl_data.get('end_time', '16:00'),
                min_employees=tmpl_data.get('min_employees', 1),
                max_employees=tmpl_data.get('max_employees'),
                applicable_days=tmpl_data.get('applicable_days', []),
                color=tmpl_data.get('color')
            )
            self.templates.append(tmpl)
        
        print(f"📋 Szablony zmian: {len(self.templates)}")
        for t in self.templates:
            days_info = t.applicable_days if t.applicable_days else "WSZYSTKIE DNI"
            print(f"   • {t.name}: {t.start_time}-{t.end_time} ({t.get_duration_minutes()}min) | Dni: {days_info}")
    
    def _parse_absences(self):
        """Parsuje nieobecności pracowników."""
        self.absences: List[Absence] = []
        self.absence_map: Dict[str, Set[str]] = defaultdict(set)
        
        for abs_data in self.raw_data.get('employee_absences', []):
            absence = Absence(
                employee_id=abs_data.get('employee_id', ''),
                start_date=abs_data.get('start_date', ''),
                end_date=abs_data.get('end_date', ''),
                absence_type=abs_data.get('absence_type', 'other')
            )
            self.absences.append(absence)
            
            try:
                start = datetime.strptime(absence.start_date, '%Y-%m-%d').date()
                end = datetime.strptime(absence.end_date, '%Y-%m-%d').date()
                current = start
                while current <= end:
                    if current.year == self.year and current.month == self.month:
                        date_str = current.strftime('%Y-%m-%d')
                        self.absence_map[absence.employee_id].add(date_str)
                    current += timedelta(days=1)
            except ValueError:
                pass
        
        for emp in self.employees:
            absence_dates = self.absence_map.get(emp.id, set())
            work_day_absences = 0
            for date_str in absence_dates:
                try:
                    d = datetime.strptime(date_str, '%Y-%m-%d').date()
                    if d.weekday() < 5:
                        work_day_absences += 1
                except ValueError:
                    pass
            emp.absence_days_count = work_day_absences
            if work_day_absences > 0:
                print(f"   📋 {emp.full_name}: {work_day_absences} dni roboczych nieobecności")
        
        print(f"🚫 Nieobecności: {len(self.absences)} rekordów")
    
    def _parse_preferences(self):
        """Parsuje preferencje pracowników."""
        self.preferences: Dict[str, EmployeePreference] = {}
        
        for pref_data in self.raw_data.get('employee_preferences', []):
            pref = EmployeePreference(
                employee_id=pref_data.get('employee_id', ''),
                preferred_start_time=pref_data.get('preferred_start_time'),
                preferred_end_time=pref_data.get('preferred_end_time'),
                max_hours_per_week=pref_data.get('max_hours_per_week'),
                max_hours_per_day=pref_data.get('max_hours_per_day'),
                can_work_weekends=pref_data.get('can_work_weekends', True),
                can_work_holidays=pref_data.get('can_work_holidays', True),
                preferred_days=pref_data.get('preferred_days', []),
                unavailable_days=pref_data.get('unavailable_days', [])
            )
            self.preferences[pref.employee_id] = pref
        
        print(f"⚙️  Preferencje: {len(self.preferences)} pracowników")
    
    def _parse_trading_sundays(self):
        """Parsuje niedziele handlowe."""
        self.trading_sundays: Set[int] = set()
        
        for ts_data in self.raw_data.get('trading_sundays', []):
            date_str = ts_data.get('date', '') if isinstance(ts_data, dict) else ts_data
            is_active = ts_data.get('is_active', True) if isinstance(ts_data, dict) else True
            
            if is_active and date_str:
                try:
                    d = datetime.strptime(date_str, '%Y-%m-%d').date()
                    if d.year == self.year and d.month == self.month:
                        self.trading_sundays.add(d.day)
                except ValueError:
                    pass
        
        print(f"📅 Niedziele handlowe: {sorted(self.trading_sundays)}")
    
    def _parse_settings(self):
        """Parsuje ustawienia organizacji i reguły planowania."""
        org = self.raw_data.get('organization_settings', {})
        rules = self.raw_data.get('scheduling_rules', {})
        
        self.min_employees_per_shift = org.get('min_employees_per_shift', 1)
        
        opening_hours_raw = org.get('opening_hours', {})
        self.opening_hours: Dict[str, Dict[str, Optional[str]]] = {}
        
        default_open = org.get('store_open_time', '08:00')
        default_close = org.get('store_close_time', '20:00')
        
        if len(default_open) > 5:
            default_open = default_open[:5]
        if len(default_close) > 5:
            default_close = default_close[:5]
        
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        for day_name in day_names:
            if day_name in opening_hours_raw:
                day_config = opening_hours_raw[day_name]
                open_time = day_config.get('open')
                close_time = day_config.get('close')
                
                if open_time and len(open_time) > 5:
                    open_time = open_time[:5]
                if close_time and len(close_time) > 5:
                    close_time = close_time[:5]
                
                self.opening_hours[day_name] = {
                    'open': open_time,
                    'close': close_time
                }
            else:
                if day_name == 'sunday':
                    self.opening_hours[day_name] = {'open': None, 'close': None}
                elif day_name == 'saturday':
                    self.opening_hours[day_name] = {
                        'open': default_open,
                        'close': '16:00' if default_close > '16:00' else default_close
                    }
                else:
                    self.opening_hours[day_name] = {
                        'open': default_open,
                        'close': default_close
                    }
        
        self.store_open_time = default_open
        self.store_close_time = default_close
        
        self.max_consecutive_days = rules.get('max_consecutive_days', LABOR_CODE['MAX_CONSECUTIVE_DAYS'])
        self.min_daily_rest_hours = rules.get('min_daily_rest_hours', LABOR_CODE['MIN_DAILY_REST_HOURS'])
        self.max_weekly_hours = rules.get('max_weekly_work_hours', LABOR_CODE['MAX_WEEKLY_HOURS'])
        
        self.solver_time_limit = self.raw_data.get('solver_time_limit', 300)
        
        print(f"\n🕐 Godziny otwarcia:")
        for day_name, hours in self.opening_hours.items():
            if hours['open'] and hours['close']:
                print(f"   {day_name}: {hours['open']} - {hours['close']}")
            else:
                print(f"   {day_name}: ZAMKNIĘTE")
    
    def _build_indices(self):
        """Buduje mapowania indeksów dla szybkiego dostępu."""
        self.emp_idx: Dict[str, int] = {e.id: i for i, e in enumerate(self.employees)}
        self.tmpl_idx: Dict[str, int] = {t.id: i for i, t in enumerate(self.templates)}
        
        self.day_to_weekday: Dict[int, int] = {}
        for day in self.all_days:
            d = date(self.year, self.month, day)
            self.day_to_weekday[day] = d.weekday()
    
    def _log_summary(self):
        """Loguje podsumowanie danych."""
        print(f"\n{'='*60}")
        print("📊 PODSUMOWANIE DATA MODEL:")
        print(f"{'='*60}")
        print(f"  Pracownicy:        {len(self.employees)}")
        print(f"  Szablony zmian:    {len(self.templates)}")
        print(f"  Nieobecności:      {len(self.absences)}")
        print(f"  Niedziele handlowe: {len(self.trading_sundays)}")
        print(f"  Norma miesięczna:  {self.monthly_norm_hours}h")
        print(f"  Limit czasowy:     {self.solver_time_limit}s")
        print(f"{'='*60}\n")
    
    def is_workable_day(self, day: int) -> bool:
        """Sprawdza czy dany dzień jest dniem pracy."""
        weekday = self.day_to_weekday[day]
        if weekday == 6:
            return day in self.trading_sundays
        return True
    
    def is_employee_absent(self, emp_id: str, day: int) -> bool:
        """Sprawdza czy pracownik ma nieobecność w danym dniu."""
        date_str = f"{self.year}-{self.month:02d}-{day:02d}"
        return date_str in self.absence_map.get(emp_id, set())
    
    def can_template_be_used_on_day(self, template: ShiftTemplate, day: int) -> bool:
        """Sprawdza czy szablon może być użyty w danym dniu."""
        if not template.applicable_days:
            return True
        
        weekday = self.day_to_weekday[day]
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        day_name = day_names[weekday]
        
        return day_name in template.applicable_days
    
    def get_date_string(self, day: int) -> str:
        """Zwraca datę w formacie YYYY-MM-DD."""
        return f"{self.year}-{self.month:02d}-{day:02d}"
    
    def get_week_number(self, day: int) -> int:
        """Zwraca numer tygodnia w miesiącu (0-4)."""
        return (day - 1) // 7


# =============================================================================
# CP-SAT SCHEDULER v4.0 - HIERARCHICZNA OPTYMALIZACJA
# =============================================================================

class CPSATScheduler:
    """
    Główna klasa optymalizatora CP-SAT v4.0.
    
    Implementuje hierarchiczną funkcję celu z gwarancją FEASIBLE:
    - TWARDE: max 1 zmiana/dzień, zakaz pracy w urlop
    - P1: Godziny w oknie [Norma, Norma+8h]
    - P2: Coverage ze slack
    - P3: Kodeks Pracy jako soft
    - P4: Preferencje
    """
    
    def __init__(self, data: DataModel):
        self.data = data
        self.model = cp_model.CpModel()
        
        # Zmienne decyzyjne
        self.shifts: Dict[Tuple[int, int, int], cp_model.IntVar] = {}
        self.works_day: Dict[Tuple[int, int], cp_model.IntVar] = {}
        
        # Zmienne pomocnicze dla godzin
        self.total_minutes_vars: Dict[int, cp_model.IntVar] = {}
        
        # Zmienne slack dla coverage
        self.coverage_slack: Dict[Tuple[int, int], cp_model.IntVar] = {}
        
        # Funkcja celu - różne poziomy
        self.objective_level1: List[Tuple[cp_model.IntVar, int, str]] = []  # Godziny
        self.objective_level2: List[Tuple[cp_model.IntVar, int, str]] = []  # Coverage
        self.objective_level2_5: List[Tuple[cp_model.IntVar, int, str]] = []  # Balance obsady
        self.objective_level3: List[Tuple[cp_model.IntVar, int, str]] = []  # Kodeks Pracy
        self.objective_level4: List[Tuple[cp_model.IntVar, int, str]] = []  # Preferencje
        
        self.stats = {
            'total_variables': 0,
            'hard_constraints': 0,
            'soft_constraints': 0,
        }
    
    # =========================================================================
    # KROK 1: Tworzenie zmiennych decyzyjnych
    # =========================================================================
    
    def create_decision_variables(self):
        """Tworzy zmienne decyzyjne dla każdej możliwej kombinacji."""
        print("\n🔧 Tworzenie zmiennych decyzyjnych...")
        
        skipped_day_mismatch = 0
        skipped_no_assignment = 0
        skipped_absence = 0
        
        for emp_idx, emp in enumerate(self.data.employees):
            for day in self.data.all_days:
                # Niedziela niehandlowa - brak zmiennych
                if not self.data.is_workable_day(day):
                    continue
                
                # TWARDE: Absolutny zakaz pracy w dni nieobecności
                # Nie tworzymy zmiennych dla dni urlopowych
                if self.data.is_employee_absent(emp.id, day):
                    skipped_absence += 1
                    continue
                
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    if emp.template_assignments:
                        if tmpl.id not in emp.template_assignments:
                            skipped_no_assignment += 1
                            continue
                    
                    if not self.data.can_template_be_used_on_day(tmpl, day):
                        skipped_day_mismatch += 1
                        continue
                    
                    var_name = f"s_{emp_idx}_{day}_{tmpl_idx}"
                    self.shifts[(emp_idx, day, tmpl_idx)] = self.model.NewBoolVar(var_name)
                    self.stats['total_variables'] += 1
        
        print(f"   ⏩ Pominięto (nieobecność - TWARDE): {skipped_absence}")
        print(f"   ⏩ Pominięto (brak przypisania): {skipped_no_assignment}")
        print(f"   ⏩ Pominięto (zły dzień tygodnia): {skipped_day_mismatch}")
        
        # Utwórz zmienne works_day
        for emp_idx, emp in enumerate(self.data.employees):
            for day in self.data.all_days:
                if not self.data.is_workable_day(day):
                    continue
                if self.data.is_employee_absent(emp.id, day):
                    continue
                
                var_name = f"w_{emp_idx}_{day}"
                self.works_day[(emp_idx, day)] = self.model.NewBoolVar(var_name)
                
                shift_vars_for_day = [
                    self.shifts[(emp_idx, day, t)]
                    for t in range(len(self.data.templates))
                    if (emp_idx, day, t) in self.shifts
                ]
                
                if shift_vars_for_day:
                    self.model.AddMaxEquality(self.works_day[(emp_idx, day)], shift_vars_for_day)
                else:
                    # Brak możliwych zmian - works_day = 0
                    self.model.Add(self.works_day[(emp_idx, day)] == 0)
        
        print(f"   ✅ Utworzono {self.stats['total_variables']} zmiennych shift")
        print(f"   ✅ Utworzono {len(self.works_day)} zmiennych works_day")
    
    # =========================================================================
    # KROK 2: ZASADY TWARDE (Bezwzględne)
    # =========================================================================
    
    def add_hard_constraints(self):
        """
        Dodaje TYLKO absolutnie twarde ograniczenia:
        1. Max 1 zmiana dziennie na pracownika
        2. Zakaz pracy w urlop (już obsłużone przez brak zmiennych)
        3. Max employees per shift
        4. Zakaz nakładania się zmian (dla zmian nocnych przechodzących przez północ)
        5. Min 1 kierownik na każdej zmianie (jeśli są kierownicy)
        """
        print("\n🔒 Dodawanie ZASAD TWARDYCH (absolutne)...")
        
        self._add_hc1_one_shift_per_day()
        self._add_hc2_max_employees_per_shift()
        self._add_hc3_no_overlapping_shifts()
        self._add_hc4_supervisor_per_shift()
        self._add_hc5_min_coverage()
        
        print(f"   ✅ Dodano {self.stats['hard_constraints']} hard constraints")
    
    def _add_hc1_one_shift_per_day(self):
        """
        TWARDE: Maksymalnie jedna zmiana dziennie na pracownika.
        """
        print("   → HC1: Max 1 zmiana/dzień/pracownik")
        
        for emp_idx in range(len(self.data.employees)):
            for day in self.data.all_days:
                shift_vars = [
                    self.shifts[(emp_idx, day, t)]
                    for t in range(len(self.data.templates))
                    if (emp_idx, day, t) in self.shifts
                ]
                if shift_vars:
                    self.model.Add(sum(shift_vars) <= 1)
                    self.stats['hard_constraints'] += 1
    
    def _add_hc2_max_employees_per_shift(self):
        """
        TWARDE: Max employees na zmianę.
        To chroni przed nadmiarem kadrowym.
        """
        print("   → HC2: Max employees per shift")
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            for tmpl_idx, tmpl in enumerate(self.data.templates):
                if not self.data.can_template_be_used_on_day(tmpl, day):
                    continue
                
                max_allowed = tmpl.max_employees
                if max_allowed is None:
                    continue
                
                assigned_vars = [
                    self.shifts[(e, day, tmpl_idx)]
                    for e in range(len(self.data.employees))
                    if (e, day, tmpl_idx) in self.shifts
                ]
                
                if assigned_vars and max_allowed is not None:
                    self.model.Add(sum(assigned_vars) <= max_allowed)
                    self.stats['hard_constraints'] += 1
    
    def _add_hc3_no_overlapping_shifts(self):
        """
        TWARDE: Zakaz nakładania się zmian dla zmian nocnych.
        
        Gdy zmiana nocna (np. 19:00-07:00) jest przypisana do dnia D,
        kończy się rano dnia D+1. Następna zmiana w dniu D+1 nie może
        zaczynać się przed zakończeniem zmiany nocnej.
        
        Przykład:
        - Zmiana nocna w dniu 5: 19:00-07:00 (kończy się 6-tego o 07:00)
        - Zmiana w dniu 6: 06:00-14:00 (zaczyna się przed 07:00)
        - Te zmiany się NAKŁADAJĄ - nie można przypisać obu!
        
        UWAGA: rest < 0 oznacza nakładanie się zmian.
        """
        print("   → HC3: Zakaz nakładania się zmian (nocne)")
        
        overlaps_blocked = 0
        
        for emp_idx in range(len(self.data.employees)):
            for day in self.data.all_days[:-1]:
                next_day = day + 1
                
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    if (emp_idx, day, tmpl_idx) not in self.shifts:
                        continue
                    
                    # Sprawdź tylko zmiany nocne (kończą się następnego dnia)
                    if not tmpl.is_night_shift():
                        continue
                    
                    # Czas zakończenia zmiany nocnej (minuty od północy następnego dnia)
                    # np. 07:00 = 420 minut
                    night_shift_end_next_day = tmpl._parse_time(tmpl.end_time)
                    
                    for next_tmpl_idx, next_tmpl in enumerate(self.data.templates):
                        if (emp_idx, next_day, next_tmpl_idx) not in self.shifts:
                            continue
                        
                        next_shift_start = next_tmpl.get_start_minutes()
                        
                        # Jeśli następna zmiana zaczyna się PRZED zakończeniem nocnej
                        # = nakładanie się = ZABRONIONE
                        if next_shift_start < night_shift_end_next_day:
                            # Nie można przypisać obu zmian jednocześnie
                            self.model.Add(
                                self.shifts[(emp_idx, day, tmpl_idx)] +
                                self.shifts[(emp_idx, next_day, next_tmpl_idx)] <= 1
                            )
                            self.stats['hard_constraints'] += 1
                            overlaps_blocked += 1
        
        print(f"      • Zablokowano {overlaps_blocked} par nakładających się zmian")
    
    def _add_hc4_supervisor_per_shift(self):
        """
        MIESZANE: Kierownik obecny na zmianach.
        
        TWARDE: Co najmniej 1 kierownik musi pracować w każdym dniu roboczym
                (ale może być na dowolnej zmianie).
        MIĘKKIE: Preferujemy kierownika na każdym szablonie zmiany w danym dniu.
                 Kara za brak kierownika na aktywnej zmianie.
        
        To podejście gwarantuje FEASIBLE nawet gdy:
        - Jest 1 kierownik i 3+ szablony zmian
        - Kierownik może pracować max 1 zmianę/dzień (HC1)
        
        Kierownicy (is_supervisor=True) to osoby odpowiedzialne za zmianę.
        Constraint jest aktywny tylko jeśli są jacyś kierownicy w organizacji.
        """
        # Znajdź indeksy kierowników
        supervisor_indices = [
            idx for idx, emp in enumerate(self.data.employees)
            if emp.is_supervisor
        ]
        
        if not supervisor_indices:
            print("   → HC4: Brak kierowników - pomijam constraint")
            return
        
        # Debug: wypisz kierowników
        for idx in supervisor_indices:
            emp = self.data.employees[idx]
            print(f"      🔑 Kierownik #{idx}: {emp.full_name} (id={emp.id})")
        
        # Oblicz ile szablonów jest aktywnych per dzień (do decyzji hard vs soft)
        num_supervisors = len(supervisor_indices)
        
        print(f"   → HC4: Kierownicy na zmianach ({num_supervisors} kierowników)")
        
        hard_constraints_added = 0
        soft_constraints_added = 0
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            # === Co najmniej 1 kierownik pracuje tego dnia (SOFT z wysoką karą) ===
            # Soft zamiast hard, bo kierownicy mogą mieć ograniczenia uniemożliwiające
            # pracę (np. max godzin, brak dostępnych szablonów).
            supervisor_work_vars = []
            for emp_idx in supervisor_indices:
                if (emp_idx, day) in self.works_day:
                    # Sprawdź czy kierownik ma faktyczne opcje zmianowe
                    has_shifts = any(
                        (emp_idx, day, t) in self.shifts
                        for t in range(len(self.data.templates))
                    )
                    if has_shifts:
                        supervisor_work_vars.append(self.works_day[(emp_idx, day)])
            
            if supervisor_work_vars:
                # SOFT constraint: kara za brak kierownika w danym dniu
                no_supervisor_today = self.model.NewBoolVar(f"no_sup_day_{day}")
                # no_supervisor_today = 1 jeśli żaden kierownik nie pracuje
                # sum(supervisor_work_vars) >= 1 - no_supervisor_today * 1
                # Jeśli no_supervisor_today=0 → sum >= 1 (musi być kierownik)
                # Jeśli no_supervisor_today=1 → sum >= 0 (nie musi być)
                self.model.Add(sum(supervisor_work_vars) >= 1).OnlyEnforceIf(no_supervisor_today.Not())
                self.model.Add(sum(supervisor_work_vars) == 0).OnlyEnforceIf(no_supervisor_today)
                
                self.objective_level2.append((
                    no_supervisor_today,
                    WEIGHT_HIERARCHY['COVERAGE_SLACK_PER_PERSON'] * 2,  # Wysoka kara
                    f"no_supervisor_day_{day}"
                ))
                soft_constraints_added += 1
            
            # === MIĘKKIE: Preferuj kierownika na KAŻDYM szablonie ===
            # Zbierz aktywne szablony na ten dzień
            active_templates_today = []
            for tmpl_idx, tmpl in enumerate(self.data.templates):
                if not self.data.can_template_be_used_on_day(tmpl, day):
                    continue
                active_templates_today.append(tmpl_idx)
            
            for tmpl_idx in active_templates_today:
                tmpl = self.data.templates[tmpl_idx]
                
                # Zbierz zmiany kierowników dla tego szablonu
                supervisor_shifts_for_template = []
                for emp_idx in supervisor_indices:
                    if (emp_idx, day, tmpl_idx) in self.shifts:
                        supervisor_shifts_for_template.append(self.shifts[(emp_idx, day, tmpl_idx)])
                
                if not supervisor_shifts_for_template:
                    continue
                
                # Zbierz WSZYSTKIE zmiany (wszyscy pracownicy) dla tego szablonu
                all_shifts_for_template = [
                    self.shifts[(e, day, tmpl_idx)]
                    for e in range(len(self.data.employees))
                    if (e, day, tmpl_idx) in self.shifts
                ]
                
                if not all_shifts_for_template:
                    continue
                
                # Zmienna: czy zmiana jest aktywna (ma jakichkolwiek pracowników)
                shift_is_active = self.model.NewBoolVar(f"shift_active_{day}_{tmpl_idx}")
                self.model.AddMaxEquality(shift_is_active, all_shifts_for_template)
                
                # Zmienna: czy kierownik jest na tej zmianie
                sup_on_shift = self.model.NewBoolVar(f"sup_on_shift_{day}_{tmpl_idx}")
                self.model.AddMaxEquality(sup_on_shift, supervisor_shifts_for_template)
                
                # Kara za: zmiana jest aktywna ALE nie ma na niej kierownika
                # missing_sup = shift_is_active AND NOT sup_on_shift
                missing_sup = self.model.NewBoolVar(f"missing_sup_{day}_{tmpl_idx}")
                # missing_sup >= shift_is_active - sup_on_shift
                self.model.Add(missing_sup >= shift_is_active - sup_on_shift)
                # missing_sup <= shift_is_active (only penalize if shift is active)
                self.model.Add(missing_sup <= shift_is_active)
                # missing_sup <= 1 - sup_on_shift (only penalize if no supervisor)
                self.model.Add(missing_sup <= 1 - sup_on_shift)
                
                self.objective_level2.append((
                    missing_sup,
                    WEIGHT_HIERARCHY['COVERAGE_SLACK_PER_PERSON'],
                    f"missing_supervisor_{day}_{tmpl.name}"
                ))
                soft_constraints_added += 1
                
                # Max 1 kierownik na zmianę (nie marnujemy kierowników)
                if len(supervisor_shifts_for_template) > 1:
                    self.model.Add(sum(supervisor_shifts_for_template) <= 1)
                    self.stats['hard_constraints'] += 1
        
        print(f"      • MIĘKKIE: preferencja kierownika na {soft_constraints_added} zmian/dni")
    
    def _add_hc5_min_coverage(self):
        """
        TWARDE: Minimum 1 pracownik w każdym slocie czasowym godzin otwarcia.
        
        Sklep otwarty = MUSI być minimum 1 pracownik w każdej chwili.
        Dzielimy godziny otwarcia na sloty (co 30 min) i dla każdego slotu
        wymagamy aby przynajmniej jedna zmiana go pokrywała.
        
        Przykład: Godziny 10:00-18:00, zmiany 10-16 i 11-17
        - Slot 10:00-10:30: pokrywa zmiana 10-16
        - Slot 11:00-11:30: pokrywają obie zmiany
        - Slot 16:30-17:00: pokrywa zmiana 11-17
        - Slot 17:30-18:00: ŻADNA zmiana nie pokrywa! (błąd konfiguracji)
        """
        print("   → HC5: Min 1 pracownik w każdym slocie godzin otwarcia")
        
        SLOT_DURATION = 30  # minuty
        slots_covered = 0
        
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            weekday = self.data.day_to_weekday[day]
            day_name = day_names[weekday]
            
            # Pobierz godziny otwarcia dla tego dnia
            day_hours = self.data.opening_hours.get(day_name, {})
            open_time = day_hours.get('open')
            close_time = day_hours.get('close')
            
            if not open_time or not close_time:
                continue
            
            # Parsuj godziny otwarcia
            open_minutes = parse_time_to_minutes(open_time)
            close_minutes = parse_time_to_minutes(close_time, is_end_time=True)
            
            # Generuj sloty czasowe
            current = open_minutes
            while current < close_minutes:
                slot_start = current
                slot_end = min(current + SLOT_DURATION, close_minutes)
                
                # Znajdź wszystkie zmiany pokrywające ten slot
                covering_shifts = []
                
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    if not self.data.can_template_be_used_on_day(tmpl, day):
                        continue
                    
                    tmpl_start = tmpl.get_start_minutes()
                    tmpl_end = tmpl.get_end_minutes()
                    
                    # Zmiana pokrywa slot jeśli zaczyna się przed lub w momencie startu slotu
                    # i kończy się po lub w momencie końca slotu
                    if tmpl_start <= slot_start and tmpl_end >= slot_end:
                        # Zbierz wszystkich pracowników mogących obsadzić tę zmianę
                        for e in range(len(self.data.employees)):
                            if (e, day, tmpl_idx) in self.shifts:
                                covering_shifts.append(self.shifts[(e, day, tmpl_idx)])
                
                if covering_shifts:
                    # ZAWSZE minimum 1 pracownik pokrywający ten slot
                    self.model.Add(sum(covering_shifts) >= 1)
                    self.stats['hard_constraints'] += 1
                    slots_covered += 1
                
                current += SLOT_DURATION
        
        print(f"      • Wymuszono min 1 pracownika na {slots_covered} slotów czasowych")
    
    # =========================================================================
    # KROK 3: PRIORYTET NR 1 - Godziny (Funkcja Celu)
    # =========================================================================
    
    def add_hours_objective(self):
        """
        PRIORYTET NR 1: Godziny w oknie [Norma, Norma + 480 min]
        
        - Under-target (poniżej Normy): 10,000,000 pkt/min
        - W buforze [Norma, Norma+480]: 0 pkt
        - Over-buffer (powyżej Norma+480): 10,000,000 pkt/min
        """
        print("\n📊 Dodawanie PRIORYTETU NR 1 - Godziny...")
        
        work_days_count = len(self.data.weekdays)
        
        for emp_idx, emp in enumerate(self.data.employees):
            target_minutes = emp.get_target_minutes(self.data.monthly_norm_minutes, work_days_count)
            buffer_max = target_minutes + HOURS_BUFFER_MINUTES
            
            # Oblicz sumę minut przypisanych pracownikowi
            total_minutes_terms = []
            
            for day in self.data.all_days:
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    if (emp_idx, day, tmpl_idx) in self.shifts:
                        duration = tmpl.get_duration_minutes()
                        total_minutes_terms.append(
                            self.shifts[(emp_idx, day, tmpl_idx)] * duration
                        )
            
            if not total_minutes_terms:
                # Brak możliwych zmian - pracownik całkowicie niedostępny
                print(f"      ⚠️ {emp.full_name}: brak możliwych zmian (pełna niedostępność)")
                continue
            
            # Maksymalna możliwa liczba minut
            max_possible = sum(
                tmpl.get_duration_minutes() 
                for tmpl in self.data.templates
            ) * self.data.days_in_month
            
            # Zmienna: całkowite minuty pracownika
            total_minutes = self.model.NewIntVar(0, max_possible, f"total_min_{emp_idx}")
            self.model.Add(total_minutes == sum(total_minutes_terms))
            self.total_minutes_vars[emp_idx] = total_minutes
            
            # ===== UNDER-TARGET (poniżej normy) =====
            # under = max(0, target - total)
            under_target = self.model.NewIntVar(0, target_minutes, f"under_{emp_idx}")
            # Pomocnicza zmienna dla różnicy
            diff_under = self.model.NewIntVar(-max_possible, max_possible, f"diff_under_{emp_idx}")
            self.model.Add(diff_under == target_minutes - total_minutes)
            self.model.AddMaxEquality(under_target, [diff_under, 0])
            
            # Kara za każdą minutę poniżej normy
            self.objective_level1.append((
                under_target,
                WEIGHT_HIERARCHY['HOURS_UNDER_TARGET_PER_MINUTE'],
                f"under_target_{emp.full_name}"
            ))
            
            # ===== OVER-BUFFER (powyżej normy + 8h) =====
            # over = max(0, total - buffer_max)
            over_buffer = self.model.NewIntVar(0, max_possible, f"over_{emp_idx}")
            diff_over = self.model.NewIntVar(-max_possible, max_possible, f"diff_over_{emp_idx}")
            self.model.Add(diff_over == total_minutes - buffer_max)
            self.model.AddMaxEquality(over_buffer, [diff_over, 0])
            
            # Kara za każdą minutę powyżej bufora
            self.objective_level1.append((
                over_buffer,
                WEIGHT_HIERARCHY['HOURS_OVER_BUFFER_PER_MINUTE'],
                f"over_buffer_{emp.full_name}"
            ))
            
            self.stats['soft_constraints'] += 2
            
            print(f"      • {emp.full_name}: target={target_minutes}min ({target_minutes//60}h), "
                  f"bufor=[{target_minutes}, {buffer_max}] min")
    
    # =========================================================================
    # KROK 4: PRIORYTET NR 2 - Coverage ze Slack
    # =========================================================================
    
    def add_coverage_with_slack(self):
        """
        PRIORYTET NR 2: Coverage ze zmiennymi slack.
        
        Zamiast HARD constraint na min_employees, używamy slack variables.
        Każdy brakujący pracownik = 100,000 pkt kary.
        
        To gwarantuje że solver ZAWSZE znajdzie rozwiązanie.
        
        UWAGA: min_employees = 0 oznacza że zmiana jest OPCJONALNA.
        Solver może jej użyć (np. żeby dobić godziny), ale nie ma kary za nieużycie.
        """
        print("\n📊 Dodawanie PRIORYTETU NR 2 - Coverage ze Slack...")
        
        coverage_count = 0
        optional_shifts = 0
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            for tmpl_idx, tmpl in enumerate(self.data.templates):
                if not self.data.can_template_be_used_on_day(tmpl, day):
                    continue
                
                min_required = tmpl.min_employees
                
                # min_employees = 0 oznacza zmianę OPCJONALNĄ
                # Solver może jej użyć, ale nie ma kary za nieużycie
                if min_required < 1:
                    optional_shifts += 1
                    continue
                
                # Zbierz wszystkie zmienne dla tego szablonu w tym dniu
                assigned_vars = [
                    self.shifts[(e, day, tmpl_idx)]
                    for e in range(len(self.data.employees))
                    if (e, day, tmpl_idx) in self.shifts
                ]
                
                if not assigned_vars:
                    # Brak pracowników mogących obsadzić tę zmianę
                    # Automatycznie slack = min_required
                    slack = self.model.NewConstant(min_required)
                    self.coverage_slack[(day, tmpl_idx)] = slack
                    
                    self.objective_level2.append((
                        slack,
                        WEIGHT_HIERARCHY['COVERAGE_SLACK_PER_PERSON'],
                        f"no_candidates_{day}_{tmpl.name}"
                    ))
                    coverage_count += 1
                    continue
                
                # Zmienna: ilu przypisanych
                assigned_count = self.model.NewIntVar(0, len(assigned_vars), f"cov_{day}_{tmpl_idx}")
                self.model.Add(assigned_count == sum(assigned_vars))
                
                # Slack: ile brakuje do minimum
                # slack = max(0, min_required - assigned_count)
                slack = self.model.NewIntVar(0, min_required, f"slack_{day}_{tmpl_idx}")
                diff = self.model.NewIntVar(-len(assigned_vars), min_required, f"slack_diff_{day}_{tmpl_idx}")
                self.model.Add(diff == min_required - assigned_count)
                self.model.AddMaxEquality(slack, [diff, 0])
                
                self.coverage_slack[(day, tmpl_idx)] = slack
                
                # Kara za każdego brakującego pracownika
                self.objective_level2.append((
                    slack,
                    WEIGHT_HIERARCHY['COVERAGE_SLACK_PER_PERSON'],
                    f"coverage_slack_{day}_{tmpl.name}"
                ))
                
                coverage_count += 1
        
        self.stats['soft_constraints'] += coverage_count
        print(f"   ✅ Dodano {coverage_count} zmiennych slack dla coverage")
    
    # =========================================================================
    # KROK 5: PRIORYTET NR 3 - Kodeks Pracy (Miękkie)
    # =========================================================================
    
    def add_labor_code_soft_constraints(self):
        """
        PRIORYTET NR 3: Kodeks Pracy jako ograniczenia miękkie.
        
        - Odpoczynek 11h dobowy: 10,000 pkt za naruszenie
        - Odpoczynek 35h tygodniowy: 10,000 pkt za naruszenie
        - Max 6 dni z rzędu: 10,000 pkt za naruszenie
        - Max 48h/tydzień: 10,000 pkt za naruszenie
        """
        print("\n📊 Dodawanie PRIORYTETU NR 3 - Kodeks Pracy (soft)...")
        
        self._add_sc_daily_rest_11h()
        self._add_sc_consecutive_days()
        self._add_sc_weekly_hours_48h()
        self._add_sc_weekly_rest_35h()
        
        print(f"   ✅ Dodano ograniczenia Kodeksu Pracy jako soft constraints")
    
    def _add_sc_daily_rest_11h(self):
        """
        SOFT: Odpoczynek 11h między zmianami.
        Za każde naruszenie: 10,000 pkt.
        
        UWAGA: Nakładanie się zmian (rest < 0) jest obsługiwane jako HARD constraint
        w metodzie add_hard_constraints -> _add_hc3_no_overlapping_shifts()
        
        OBSŁUGA ZMIAN NOCNYCH:
        Zmiana nocna (np. 19:00-07:00) kończy się następnego dnia.
        get_end_minutes() zwraca wartość > 1440 dla takich zmian.
        
        Przykład kalkulacji odpoczynku:
        - Zmiana 1: 19:00-07:00 (shift_end = 1860, czyli 07:00 następnego dnia)
        - Zmiana 2 następnego dnia: 08:00-16:00 (next_start = 480)
        - rest = 480 - (1860 - 1440) = 480 - 420 = 60 min = 1h (naruszenie 11h!)
        """
        min_rest_minutes = self.data.min_daily_rest_hours * 60
        violations = 0
        
        for emp_idx in range(len(self.data.employees)):
            for day in self.data.all_days[:-1]:
                next_day = day + 1
                
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    if (emp_idx, day, tmpl_idx) not in self.shifts:
                        continue
                    
                    # get_end_minutes() zwraca wartość > 1440 dla zmian nocnych
                    shift_end = tmpl.get_end_minutes()
                    
                    for next_tmpl_idx, next_tmpl in enumerate(self.data.templates):
                        if (emp_idx, next_day, next_tmpl_idx) not in self.shifts:
                            continue
                        
                        next_shift_start = next_tmpl.get_start_minutes()
                        
                        # Oblicz przerwę między zmianami
                        # shift_end może być > 1440 dla zmian nocnych (kończy się następnego dnia)
                        if shift_end <= 1440:
                            # Zmiana dzienna: kończy się tego samego dnia
                            # rest = czas do północy + czas od północy do startu następnej
                            rest = (24 * 60 - shift_end) + next_shift_start
                        else:
                            # Zmiana nocna: kończy się następnego dnia
                            # shift_end - 1440 = ile minut po północy kończy się zmiana
                            # rest = start następnej - koniec poprzedniej (oba w tym samym dniu)
                            rest = next_shift_start - (shift_end - 24 * 60)
                        
                        # Nakładanie (rest < 0) jest HARD constraint, tu tylko soft dla rest >= 0
                        if rest >= 0 and rest < min_rest_minutes:
                            # Zmienna binarna: czy oba przypisane (naruszenie)
                            # violation = 1 jeśli obie zmiany są przypisane
                            violation = self.model.NewBoolVar(f"rest_viol_{emp_idx}_{day}_{tmpl_idx}_{next_tmpl_idx}")
                            
                            shift1 = self.shifts[(emp_idx, day, tmpl_idx)]
                            shift2 = self.shifts[(emp_idx, next_day, next_tmpl_idx)]
                            
                            # violation >= shift1 + shift2 - 1
                            # Jeśli obie = 1, to violation >= 1, czyli violation = 1
                            # Jeśli co najwyżej jedna = 1, to violation >= 0, może być 0 lub 1
                            # Solver będzie chciał minimalizować, więc wybierze 0
                            self.model.Add(violation >= shift1 + shift2 - 1)
                            
                            self.objective_level3.append((
                                violation,
                                WEIGHT_HIERARCHY['DAILY_REST_VIOLATION'],
                                f"rest_11h_{emp_idx}_{day}"
                            ))
                            violations += 1
        
        self.stats['soft_constraints'] += violations
        print(f"   → Odpoczynek 11h: {violations} potencjalnych naruszeń")
    
    def _add_sc_consecutive_days(self):
        """
        SOFT: Max 6 dni pracy z rzędu.
        Za każdy dzień >6: 10,000 pkt.
        """
        max_consecutive = self.data.max_consecutive_days
        window_size = max_consecutive + 1  # 7 dni
        violations = 0
        
        for emp_idx in range(len(self.data.employees)):
            for start_day in range(1, self.data.days_in_month - window_size + 2):
                window_days = list(range(start_day, start_day + window_size))
                
                work_vars = []
                for day in window_days:
                    if day <= self.data.days_in_month and (emp_idx, day) in self.works_day:
                        work_vars.append(self.works_day[(emp_idx, day)])
                
                if len(work_vars) == window_size:
                    # Zmienna pomocnicza dla przekroczenia
                    # excess = 1 jeśli suma >= 7 (pracuje wszystkie dni w oknie)
                    excess = self.model.NewIntVar(0, 1, f"consec_excess_{emp_idx}_{start_day}")
                    # excess >= sum - 6, czyli jeśli sum >= 7, excess >= 1
                    diff = self.model.NewIntVar(-window_size, 1, f"consec_diff_{emp_idx}_{start_day}")
                    self.model.Add(diff == sum(work_vars) - (window_size - 1))
                    self.model.AddMaxEquality(excess, [diff, 0])
                    
                    self.objective_level3.append((
                        excess,
                        WEIGHT_HIERARCHY['CONSECUTIVE_DAYS_VIOLATION'],
                        f"consecutive_{emp_idx}_{start_day}"
                    ))
                    violations += 1
        
        self.stats['soft_constraints'] += violations
        print(f"   → Max 6 dni z rzędu: {violations} potencjalnych naruszeń")
    
    def _add_sc_weekly_hours_48h(self):
        """
        SOFT: Max 48h pracy tygodniowo.
        Za każdą godzinę >48: 10,000 pkt.
        
        Używamy AddMaxEquality z zerem
        """
        max_weekly_minutes = self.data.max_weekly_hours * 60
        weeks_checked = 0
        
        # Tworzymy zero raz
        zero_var = self.model.NewIntVar(0, 0, "zero")
        
        for emp_idx in range(len(self.data.employees)):
            weeks: Dict[int, List[int]] = defaultdict(list)
            for day in self.data.all_days:
                week_num = self.data.get_week_number(day)
                weeks[week_num].append(day)
            
            for week_num, week_days in weeks.items():
                week_minutes_terms = []
                
                for day in week_days:
                    for tmpl_idx, tmpl in enumerate(self.data.templates):
                        if (emp_idx, day, tmpl_idx) in self.shifts:
                            duration = tmpl.get_duration_minutes()
                            week_minutes_terms.append(
                                self.shifts[(emp_idx, day, tmpl_idx)] * duration
                            )
                
                if not week_minutes_terms:
                    continue
                
                max_possible_week = len(week_days) * max(t.get_duration_minutes() for t in self.data.templates)
                
                week_minutes = self.model.NewIntVar(0, max_possible_week, f"week_min_{emp_idx}_{week_num}")
                self.model.Add(week_minutes == sum(week_minutes_terms))
                
                # Przekroczenie: overtime >= week_minutes - max_weekly_minutes oraz overtime >= 0
                overtime = self.model.NewIntVar(0, max_possible_week, f"overtime_{emp_idx}_{week_num}")
                self.model.Add(overtime >= week_minutes - max_weekly_minutes)
                self.model.Add(overtime >= 0)
                
                # Karamy za minuty przekroczenia (nie godziny - prostsze)
                self.objective_level3.append((
                    overtime,
                    WEIGHT_HIERARCHY['MAX_WEEKLY_HOURS_VIOLATION'] // 60,  # Przeliczone na minuty
                    f"weekly_48h_{emp_idx}_{week_num}"
                ))
                weeks_checked += 1
        
        self.stats['soft_constraints'] += weeks_checked
        print(f"   → Max 48h/tydzień: {weeks_checked} tygodni sprawdzonych")
    
    def _add_sc_weekly_rest_35h(self):
        """
        SOFT: Min 35h odpoczynku tygodniowego.
        Uproszczona wersja: min 1 dzień wolny w tygodniu.
        """
        violations = 0
        
        for emp_idx in range(len(self.data.employees)):
            weeks: Dict[int, List[int]] = defaultdict(list)
            for day in self.data.all_days:
                week_num = self.data.get_week_number(day)
                weeks[week_num].append(day)
            
            for week_num, week_days in weeks.items():
                if len(week_days) < 7:
                    continue
                
                work_vars = []
                for day in week_days:
                    if (emp_idx, day) in self.works_day:
                        work_vars.append(self.works_day[(emp_idx, day)])
                
                if len(work_vars) == 7:
                    # all_7_days = 1 jeśli pracuje wszystkie 7 dni (brak dnia wolnego)
                    # Używamy: excess >= sum - 6
                    excess = self.model.NewIntVar(0, 1, f"no_rest_{emp_idx}_{week_num}")
                    diff = self.model.NewIntVar(-7, 1, f"rest_diff_{emp_idx}_{week_num}")
                    self.model.Add(diff == sum(work_vars) - 6)
                    self.model.AddMaxEquality(excess, [diff, 0])
                    
                    self.objective_level3.append((
                        excess,
                        WEIGHT_HIERARCHY['WEEKLY_REST_VIOLATION'],
                        f"weekly_rest_{emp_idx}_{week_num}"
                    ))
                    violations += 1
        
        self.stats['soft_constraints'] += violations
        print(f"   → Odpoczynek 35h (1 dzień wolny/tydzień): {violations} potencjalnych naruszeń")
    
    # =========================================================================
    # KROK 6: PRIORYTET NR 4 - Preferencje i Sprawiedliwość
    # =========================================================================
    
    def add_preferences_and_fairness(self):
        """
        PRIORYTET NR 4: Preferencje i sprawiedliwość.
        Najniższa waga (100 pkt).
        """
        print("\n📊 Dodawanie PRIORYTETU NR 4 - Preferencje i sprawiedliwość...")
        
        self._add_preference_bonuses()
        self._add_sunday_penalty()
        self._add_weekend_fairness()
        self._add_shift_distribution_fairness()
        self._add_daily_coverage_balance()
        
        print(f"   ✅ Dodano preferencje i sprawiedliwość")
    
    def _add_preference_bonuses(self):
        """Bonus/kara za preferencje pracowników."""
        bonuses = 0
        
        for emp_idx, emp in enumerate(self.data.employees):
            pref = self.data.preferences.get(emp.id)
            if not pref:
                continue
            
            for day in self.data.all_days:
                weekday = self.data.day_to_weekday[day]
                is_avoided = weekday in pref.unavailable_days
                
                if is_avoided:
                    # Kara za pracę w niechciany dzień
                    if (emp_idx, day) in self.works_day:
                        self.objective_level4.append((
                            self.works_day[(emp_idx, day)],
                            WEIGHT_HIERARCHY['AVOIDED_DAY_PENALTY'],
                            f"avoided_day_{emp_idx}_{day}"
                        ))
                        bonuses += 1
        
        self.stats['soft_constraints'] += bonuses
        print(f"   → Preferencje dni: {bonuses} uwzględnione")
    
    def _add_sunday_penalty(self):
        """Lekka kara za pracę w niedzielę (zachęca do wolnych niedziel)."""
        penalties = 0
        
        for emp_idx in range(len(self.data.employees)):
            for day in self.data.trading_sundays:
                if (emp_idx, day) in self.works_day:
                    self.objective_level4.append((
                        self.works_day[(emp_idx, day)],
                        WEIGHT_HIERARCHY['SUNDAY_WORK_PENALTY'],
                        f"sunday_work_{emp_idx}_{day}"
                    ))
                    penalties += 1
        
        self.stats['soft_constraints'] += penalties
        print(f"   → Praca w niedzielę: {penalties} potencjalnych kar")
    
    def _add_weekend_fairness(self):
        """Sprawiedliwy podział weekendów między pracownikami."""
        if len(self.data.employees) <= 1:
            return
        
        weekend_days = set(self.data.saturdays) | self.data.trading_sundays
        
        if not weekend_days:
            return
        
        weekend_counts = []
        
        for emp_idx in range(len(self.data.employees)):
            count_var = self.model.NewIntVar(0, len(weekend_days), f"weekend_cnt_{emp_idx}")
            
            weekend_work_vars = []
            for day in weekend_days:
                if (emp_idx, day) in self.works_day:
                    weekend_work_vars.append(self.works_day[(emp_idx, day)])
            
            if weekend_work_vars:
                self.model.Add(count_var == sum(weekend_work_vars))
            else:
                self.model.Add(count_var == 0)
            
            weekend_counts.append(count_var)
        
        if len(weekend_counts) >= 2:
            max_weekends = self.model.NewIntVar(0, len(weekend_days), "max_wknd")
            min_weekends = self.model.NewIntVar(0, len(weekend_days), "min_wknd")
            
            self.model.AddMaxEquality(max_weekends, weekend_counts)
            self.model.AddMinEquality(min_weekends, weekend_counts)
            
            weekend_diff = self.model.NewIntVar(0, len(weekend_days), "wknd_diff")
            self.model.Add(weekend_diff == max_weekends - min_weekends)
            
            self.objective_level4.append((
                weekend_diff,
                WEIGHT_HIERARCHY['WEEKEND_FAIRNESS_PENALTY'],
                "weekend_fairness"
            ))
            self.stats['soft_constraints'] += 1
        
        print(f"   → Sprawiedliwość weekendowa: aktywne")
        
        # ===== Dodatkowa sprawiedliwość dla kierowników =====
        supervisor_indices = [
            idx for idx, emp in enumerate(self.data.employees)
            if emp.is_supervisor
        ]
        
        if len(supervisor_indices) >= 2 and weekend_days:
            supervisor_weekend_counts = []
            
            for emp_idx in supervisor_indices:
                count_var = self.model.NewIntVar(0, len(weekend_days), f"sup_wknd_cnt_{emp_idx}")
                
                weekend_work_vars = []
                for day in weekend_days:
                    if (emp_idx, day) in self.works_day:
                        weekend_work_vars.append(self.works_day[(emp_idx, day)])
                
                if weekend_work_vars:
                    self.model.Add(count_var == sum(weekend_work_vars))
                else:
                    self.model.Add(count_var == 0)
                
                supervisor_weekend_counts.append(count_var)
            
            # Różnica między kierownikami w liczbie weekendów powinna być max 1
            max_sup_wknd = self.model.NewIntVar(0, len(weekend_days), "max_sup_wknd")
            min_sup_wknd = self.model.NewIntVar(0, len(weekend_days), "min_sup_wknd")
            
            self.model.AddMaxEquality(max_sup_wknd, supervisor_weekend_counts)
            self.model.AddMinEquality(min_sup_wknd, supervisor_weekend_counts)
            
            sup_wknd_diff = self.model.NewIntVar(0, len(weekend_days), "sup_wknd_diff")
            self.model.Add(sup_wknd_diff == max_sup_wknd - min_sup_wknd)
            
            # Wyższa kara dla kierowników - sprawiedliwość weekendowa jest ważniejsza
            self.objective_level4.append((
                sup_wknd_diff,
                WEIGHT_HIERARCHY['WEEKEND_FAIRNESS_PENALTY'] * 10,  # 10x ważniejsze
                "supervisor_weekend_fairness"
            ))
            self.stats['soft_constraints'] += 1
            
            print(f"   → Sprawiedliwość weekendowa kierowników: aktywne ({len(supervisor_indices)} kierowników)")
    
    def _add_shift_distribution_fairness(self):
        """Sprawiedliwy podział zmian tego samego typu."""
        if len(self.data.employees) <= 1:
            return
        
        fairness_count = 0
        
        for tmpl_idx, tmpl in enumerate(self.data.templates):
            employee_counts = []
            
            for emp_idx in range(len(self.data.employees)):
                emp_shifts = [
                    self.shifts[(emp_idx, day, tmpl_idx)]
                    for day in self.data.all_days
                    if (emp_idx, day, tmpl_idx) in self.shifts
                ]
                
                if emp_shifts:
                    count_var = self.model.NewIntVar(0, len(self.data.all_days), f"shft_cnt_{emp_idx}_{tmpl_idx}")
                    self.model.Add(count_var == sum(emp_shifts))
                    employee_counts.append(count_var)
            
            if len(employee_counts) < 2:
                continue
            
            min_count = self.model.NewIntVar(0, len(self.data.all_days), f"min_shft_{tmpl_idx}")
            max_count = self.model.NewIntVar(0, len(self.data.all_days), f"max_shft_{tmpl_idx}")
            
            self.model.AddMinEquality(min_count, employee_counts)
            self.model.AddMaxEquality(max_count, employee_counts)
            
            diff = self.model.NewIntVar(0, len(self.data.all_days), f"shft_diff_{tmpl_idx}")
            self.model.Add(diff == max_count - min_count)
            
            # Tolerujemy różnicę 1
            excess = self.model.NewIntVar(0, len(self.data.all_days), f"shft_excess_{tmpl_idx}")
            self.model.AddMaxEquality(excess, [diff - 1, 0])
            
            self.objective_level4.append((
                excess,
                WEIGHT_HIERARCHY['SHIFT_DISTRIBUTION_PENALTY'],
                f"shift_balance_{tmpl.name}"
            ))
            fairness_count += 1
        
        self.stats['soft_constraints'] += fairness_count
        print(f"   → Sprawiedliwy rozkład zmian: {fairness_count} szablonów")
    
    def _add_daily_coverage_balance(self):
        """
        Równomierne rozmieszczenie obsady w ciągu dnia.
        
        Zamiast mieć jedną zmianę z 7 pracownikami i resztę z 1,
        optymalizujemy aby obsada była równomiernie rozłożona (np. wszędzie 2-3).
        
        Dla każdego dnia minimalizujemy różnicę między max a min obsadą zmian.
        """
        balance_count = 1
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            # Zbierz zmienne obsady dla wszystkich aktywnych szablonów w tym dniu
            shift_coverage_vars = []
            
            for tmpl_idx, tmpl in enumerate(self.data.templates):
                if not self.data.can_template_be_used_on_day(tmpl, day):
                    continue
                
                # Zbierz wszystkich pracowników na tej zmianie
                assigned_vars = [
                    self.shifts[(e, day, tmpl_idx)]
                    for e in range(len(self.data.employees))
                    if (e, day, tmpl_idx) in self.shifts
                ]
                
                if assigned_vars:
                    # Zmienna: liczba pracowników na tej zmianie
                    coverage_var = self.model.NewIntVar(0, len(assigned_vars), f"day_cov_{day}_{tmpl_idx}")
                    self.model.Add(coverage_var == sum(assigned_vars))
                    shift_coverage_vars.append(coverage_var)
            
            # Jeśli są co najmniej 2 zmiany w tym dniu, minimalizuj różnicę
            if len(shift_coverage_vars) >= 2:
                max_coverage = self.model.NewIntVar(0, len(self.data.employees), f"max_cov_day_{day}")
                min_coverage = self.model.NewIntVar(0, len(self.data.employees), f"min_cov_day_{day}")
                
                self.model.AddMaxEquality(max_coverage, shift_coverage_vars)
                self.model.AddMinEquality(min_coverage, shift_coverage_vars)
                
                # Różnica między max a min obsadą
                coverage_diff = self.model.NewIntVar(0, len(self.data.employees), f"cov_diff_day_{day}")
                self.model.Add(coverage_diff == max_coverage - min_coverage)
                
                # Karamy za każdą jednostkę różnicy (chcemy aby było jak najbardziej równomiernie)
                # WYSOKI PRIORYTET - równomierna obsada to klucz do dobrego grafiku
                self.objective_level2_5.append((
                    coverage_diff,
                    WEIGHT_HIERARCHY['DAILY_COVERAGE_BALANCE'],
                    f"daily_coverage_balance_{day}"
                ))
                balance_count += 1
        
        self.stats['soft_constraints'] += balance_count
        print(f"   → Równomierna obsada dzienna: {balance_count} dni")
    
    # =========================================================================
    # KROK 7: Budowanie funkcji celu i rozwiązywanie
    # =========================================================================
    
    def build_objective(self):
        """
        Buduje hierarchiczną funkcję celu.
        
        Wszystkie poziomy są sumowane, ale wagi gwarantują hierarchię:
        - Level 1 (godziny): 10,000,000 pkt/jednostka
        - Level 2 (coverage): 100,000 pkt/jednostka
        - Level 3 (kodeks pracy): 10,000 pkt/jednostka
        - Level 4 (preferencje): 100 pkt/jednostka
        """
        print("\n🎯 Budowanie hierarchicznej funkcji celu...")
        
        objective_terms = []
        
        # Level 1: Godziny (KRYTYCZNE)
        for var, weight, name in self.objective_level1:
            objective_terms.append(var * weight)
        
        # Level 2: Coverage
        for var, weight, name in self.objective_level2:
            objective_terms.append(var * weight)
        
        # Level 2.5: Balance obsady dziennej
        for var, weight, name in self.objective_level2_5:
            objective_terms.append(var * weight)
        
        # Level 3: Kodeks Pracy
        for var, weight, name in self.objective_level3:
            objective_terms.append(var * weight)
        
        # Level 4: Preferencje (bonusy jako negatywne kary)
        for var, weight, name in self.objective_level4:
            objective_terms.append(var * weight)
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
        
        print(f"   Level 1 (Godziny): {len(self.objective_level1)} terms, waga={WEIGHT_HIERARCHY['HOURS_UNDER_TARGET_PER_MINUTE']:,}")
        print(f"   Level 2 (Coverage): {len(self.objective_level2)} terms, waga={WEIGHT_HIERARCHY['COVERAGE_SLACK_PER_PERSON']:,}")
        print(f"   Level 2.5 (Balance obsady): {len(self.objective_level2_5)} terms, waga={WEIGHT_HIERARCHY['DAILY_COVERAGE_BALANCE']:,}")
        print(f"   Level 3 (Kodeks Pracy): {len(self.objective_level3)} terms, waga={WEIGHT_HIERARCHY['DAILY_REST_VIOLATION']:,}")
        print(f"   Level 4 (Preferencje): {len(self.objective_level4)} terms, waga={WEIGHT_HIERARCHY['PREFERENCE_MATCH_BONUS']}")
    
    def solve(self, time_limit_seconds: Optional[int] = None) -> Dict:
        """Uruchamia solver CP-SAT i zwraca wynik."""
        start_time = time.time()
        
        self.build_objective()
        
        solver = cp_model.CpSolver()
        
        timeout = time_limit_seconds or self.data.solver_time_limit
        solver.parameters.max_time_in_seconds = timeout
        solver.parameters.num_search_workers = 16
        solver.parameters.log_search_progress = False
        solver.parameters.search_branching = cp_model.PORTFOLIO_SEARCH
        solver.parameters.random_seed = int(time.time()) % 10000
        solver.parameters.randomize_search = True
        
        print(f"\n🚀 Uruchamianie solvera (limit: {timeout}s, workers: 16)...")
        
        status = solver.Solve(self.model)
        self._solver_status = status
        solve_time = time.time() - start_time
        
        status_names = {
            cp_model.OPTIMAL: 'OPTIMAL',
            cp_model.FEASIBLE: 'FEASIBLE',
            cp_model.INFEASIBLE: 'INFEASIBLE',
            cp_model.MODEL_INVALID: 'MODEL_INVALID',
            cp_model.UNKNOWN: 'UNKNOWN',
        }
        status_name = status_names.get(status, 'UNKNOWN')
        
        print(f"\n{'='*60}")
        print(f"📊 WYNIK SOLVERA:")
        print(f"   Status: {status_name}")
        print(f"   Czas: {solve_time:.2f}s")
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            objective = solver.ObjectiveValue()
            print(f"   Wartość funkcji celu: {objective:,.0f}")
            
            # Analiza składowych celu
            self._analyze_objective(solver)
            
            shifts = self._extract_solution(solver)
            statistics = self._calculate_statistics(solver, shifts, solve_time)
            
            print(f"   Przypisane zmiany: {len(shifts)}")
            print(f"   Jakość: {statistics['quality_percent']:.1f}%")
            print(f"{'='*60}\n")
            
            self._print_hours_summary(shifts)
            self._print_schedule_table(shifts)
            
            return {
                'status': 'SUCCESS',
                'shifts': shifts,
                'statistics': statistics,
            }
        
        else:
            print(f"   ❌ Solver nie znalazł rozwiązania")
            print(f"{'='*60}\n")
            
            return {
                'status': 'INFEASIBLE',
                'error': f'Solver status: {status_name}',
                'reasons': self._diagnose_infeasibility(),
                'suggestions': [
                    'Sprawdź czy jest wystarczająca liczba pracowników',
                    'Sprawdź przypisania szablonów do pracowników',
                    'Sprawdź nieobecności pracowników',
                    'Zwiększ limit czasowy solvera',
                ],
            }
    
    def _analyze_objective(self, solver: cp_model.CpSolver):
        """Analizuje składowe funkcji celu."""
        print("\n   📈 Analiza składowych celu:")
        
        # Level 1: Godziny
        hours_penalty = sum(solver.Value(var) * weight for var, weight, _ in self.objective_level1)
        hours_details = []
        for var, weight, name in self.objective_level1:
            val = solver.Value(var)
            if val > 0:
                hours_details.append(f"{name}: {val}min")
        
        print(f"      L1 Godziny: {hours_penalty:,} pkt")
        if hours_details[:5]:
            for d in hours_details[:5]:
                print(f"         - {d}")
        
        # Level 2: Coverage
        coverage_penalty = sum(solver.Value(var) * weight for var, weight, _ in self.objective_level2)
        coverage_issues = sum(1 for var, _, _ in self.objective_level2 if solver.Value(var) > 0)
        print(f"      L2 Coverage: {coverage_penalty:,} pkt ({coverage_issues} braków)")
        
        # Level 2.5: Balance obsady
        balance_penalty = sum(solver.Value(var) * weight for var, weight, _ in self.objective_level2_5)
        balance_issues = sum(1 for var, _, _ in self.objective_level2_5 if solver.Value(var) > 0)
        print(f"      L2.5 Balance obsady: {balance_penalty:,} pkt ({balance_issues} dni z nierówną obsadą)")
        
        # Level 3: Kodeks Pracy
        labor_penalty = sum(solver.Value(var) * weight for var, weight, _ in self.objective_level3)
        labor_violations = sum(1 for var, _, _ in self.objective_level3 if solver.Value(var) > 0)
        print(f"      L3 Kodeks Pracy: {labor_penalty:,} pkt ({labor_violations} naruszeń)")
        
        # Level 4: Preferencje
        pref_penalty = sum(solver.Value(var) * weight for var, weight, _ in self.objective_level4)
        print(f"      L4 Preferencje: {pref_penalty:,} pkt")
    
    def _extract_solution(self, solver: cp_model.CpSolver) -> List[Dict]:
        """Ekstrahuje przypisane zmiany z rozwiązania solvera."""
        shifts = []
        
        for (emp_idx, day, tmpl_idx), var in self.shifts.items():
            if solver.Value(var) == 1:
                emp = self.data.employees[emp_idx]
                tmpl = self.data.templates[tmpl_idx]
                
                shift = {
                    'employee_id': emp.id,
                    'employee_name': emp.full_name,
                    'date': self.data.get_date_string(day),
                    'day': day,
                    'template_id': tmpl.id,
                    'template_name': tmpl.name,
                    'start_time': tmpl.start_time,
                    'end_time': tmpl.end_time,
                    'duration_minutes': tmpl.get_duration_minutes(),
                    'color': tmpl.color or emp.color,
                }
                shifts.append(shift)
        
        shifts.sort(key=lambda x: (x['date'], x['employee_name']))
        
        return shifts
    
    def _calculate_statistics(
        self, solver: cp_model.CpSolver, shifts: List[Dict], solve_time: float
    ) -> Dict:
        """Oblicza statystyki rozwiązania."""
        
        objective = solver.ObjectiveValue()
        
        # Jakość bazowana na składowych funkcji celu
        hours_penalty = sum(solver.Value(var) * weight for var, weight, _ in self.objective_level1)
        coverage_penalty = sum(solver.Value(var) * weight for var, weight, _ in self.objective_level2)
        
        # Jeśli brak kar L1 (godziny) - bardzo dobra jakość
        # Jeśli brak kar L2 (coverage) - dobra jakość
        if hours_penalty == 0 and coverage_penalty == 0:
            quality_percent = 100.0
        elif hours_penalty == 0:
            quality_percent = 90.0 - (coverage_penalty / 1_000_000)
        else:
            quality_percent = max(0, 80.0 - (hours_penalty / 100_000_000))
        
        quality_percent = max(0, min(100, quality_percent))
        
        # Jeśli OPTIMAL, jakość = 100%
        if self._solver_status == cp_model.OPTIMAL:
            quality_percent = 100.0
        
        hours_by_employee: Dict[str, float] = defaultdict(float)
        for shift in shifts:
            hours_by_employee[shift['employee_id']] += shift['duration_minutes'] / 60
        
        return {
            'status': 'OPTIMAL' if self._solver_status == cp_model.OPTIMAL else 'FEASIBLE',
            'solve_time_seconds': round(solve_time, 2),
            'objective_value': int(objective),
            'quality_percent': round(quality_percent, 1),
            'total_shifts_assigned': len(shifts),
            'total_variables': self.stats['total_variables'],
            'hard_constraints': self.stats['hard_constraints'],
            'soft_constraints': self.stats['soft_constraints'],
            'hours_by_employee': dict(hours_by_employee),
            'conflicts': solver.NumConflicts(),
            'branches': solver.NumBranches(),
        }
    
    def _print_hours_summary(self, shifts: List[Dict]):
        """Wypisuje podsumowanie godzin dla każdego pracownika."""
        print("\n📊 PODSUMOWANIE GODZIN:")
        print("-" * 70)
        
        hours_by_emp: Dict[str, float] = defaultdict(float)
        shifts_by_emp: Dict[str, int] = defaultdict(int)
        
        for shift in shifts:
            hours_by_emp[shift['employee_name']] += shift['duration_minutes'] / 60
            shifts_by_emp[shift['employee_name']] += 1
        
        work_days_count = len(self.data.weekdays)
        
        for emp in self.data.employees:
            name = emp.full_name
            target_min = emp.get_target_minutes(self.data.monthly_norm_minutes, work_days_count)
            target_h = target_min / 60
            buffer_max_h = (target_min + HOURS_BUFFER_MINUTES) / 60
            actual_h = hours_by_emp.get(name, 0)
            num_shifts = shifts_by_emp.get(name, 0)
            diff = actual_h - target_h
            
            # Status: OK jeśli w buforze
            if actual_h >= target_h and actual_h <= buffer_max_h:
                status = "✅"
            elif actual_h < target_h:
                status = "⚠️ UNDER"
            else:
                status = "⚠️ OVER"
            
            print(f"  {status} {name:25s} | Target: {target_h:5.1f}h | "
                  f"Actual: {actual_h:5.1f}h | Buffer: [{target_h:.0f}-{buffer_max_h:.0f}]h | "
                  f"Zmiany: {num_shifts}")
        
        print("-" * 70)
    
    def _print_schedule_table(self, shifts: List[Dict]):
        """Wyświetla tabelę harmonogramu dla pierwszych 10 dni."""
        print("\n📅 TABELA HARMONOGRAMU (pierwsze 10 dni):")
        print("-" * 85)
        print(f"{'Dzień':<12} | {'Pracownik':<20} | {'Zmiana':<18} | {'Godziny':<10}")
        print("-" * 85)
        
        shifts_by_day: Dict[int, List[Dict]] = defaultdict(list)
        for shift in shifts:
            shifts_by_day[shift['day']].append(shift)
        
        for day in sorted(shifts_by_day.keys())[:10]:
            day_shifts = sorted(shifts_by_day[day], key=lambda x: x['start_time'])
            date_str = f"{day:02d}.{self.data.month:02d}.{self.data.year}"
            
            for i, shift in enumerate(day_shifts):
                day_label = date_str if i == 0 else ""
                name = shift['employee_name'][:20]
                template = shift['template_name'][:18]
                hours = f"{shift['start_time'][:5]}-{shift['end_time'][:5]}"
                
                print(f"{day_label:<12} | {name:<20} | {template:<18} | {hours:<10}")
            
            if day_shifts:
                print("-" * 85)
    
    def _diagnose_infeasibility(self) -> List[str]:
        """Diagnozuje przyczyny braku rozwiązania."""
        reasons = []
        
        if len(self.data.employees) == 0:
            reasons.append("Brak aktywnych pracowników")
        
        if len(self.data.templates) == 0:
            reasons.append("Brak szablonów zmian")
        
        if self.stats['total_variables'] == 0:
            reasons.append("Brak możliwych przypisań - sprawdź przypisania szablonów i nieobecności")
        
        return reasons if reasons else ["Nieznana przyczyna - model powinien być zawsze FEASIBLE"]


# =============================================================================
# GŁÓWNA FUNKCJA API
# =============================================================================

def generate_schedule_optimized(input_data: Dict) -> Dict:
    """
    Główna funkcja do generowania grafiku.
    
    Args:
        input_data: Słownik z danymi wejściowymi
    
    Returns:
        Słownik z wynikami (status, shifts, statistics, error)
    """
    try:
        print("\n" + "="*80)
        print("🚀 CALENDA SCHEDULE - CP-SAT OPTIMIZER v4.0")
        print("   Hierarchiczna optymalizacja z gwarancją FEASIBLE")
        print("="*80)
        
        # KROK 1: Preprocessing danych
        data = DataModel(input_data)
        
        # KROK 2: Inicjalizacja schedulera
        scheduler = CPSATScheduler(data)
        
        # KROK 3: Tworzenie zmiennych decyzyjnych
        scheduler.create_decision_variables()
        
        # KROK 4: Dodawanie ZASAD TWARDYCH
        scheduler.add_hard_constraints()
        
        # KROK 5: PRIORYTET NR 1 - Godziny
        scheduler.add_hours_objective()
        
        # KROK 6: PRIORYTET NR 2 - Coverage ze Slack
        scheduler.add_coverage_with_slack()
        
        # KROK 7: PRIORYTET NR 3 - Kodeks Pracy (soft)
        scheduler.add_labor_code_soft_constraints()
        
        # KROK 8: PRIORYTET NR 4 - Preferencje
        scheduler.add_preferences_and_fairness()
        
        # KROK 9: Rozwiązywanie
        result = scheduler.solve()
        
        print("\n" + "="*80)
        print("✅ GENEROWANIE ZAKOŃCZONE")
        print("="*80 + "\n")
        
        return result
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"\n❌ BŁĄD: {str(e)}")
        print(error_trace)
        
        return {
            'status': 'ERROR',
            'error': str(e),
            'traceback': error_trace,
        }


# =============================================================================
# CLI - Uruchamianie z linii poleceń (do testów)
# =============================================================================

if __name__ == '__main__':
    # Przykładowe dane testowe
    test_data = {
        'year': 2026,
        'month': 2,
        'monthly_hours_norm': 160,
        'organization_settings': {
            'min_employees_per_shift': 1,
            'enable_trading_sundays': True,
        },
        'shift_templates': [
            {
                'id': 'morning_8h',
                'name': 'Poranna 8h',
                'start_time': '08:00',
                'end_time': '16:00',
                'min_employees': 1,
                'max_employees': 3,
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
            {
                'id': 'morning_6h',
                'name': 'Poranna 6h',
                'start_time': '08:00',
                'end_time': '14:00',
                'min_employees': 1,
                'max_employees': 2,
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            },
            {
                'id': 'afternoon_8h',
                'name': 'Popołudniowa 8h',
                'start_time': '14:00',
                'end_time': '22:00',
                'min_employees': 1,
                'max_employees': 3,
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
            {
                'id': 'long_12h',
                'name': 'Długi dyżur 12h',
                'start_time': '08:00',
                'end_time': '20:00',
                'min_employees': 1,
                'max_employees': 2,
                'applicable_days': ['saturday', 'sunday'],
            },
            {
                'id': 'night_12h',
                'name': 'Nocna 12h',
                'start_time': '19:00',
                'end_time': '07:00',  # ZMIANA NOCNA - kończy się następnego dnia!
                'min_employees': 1,
                'max_employees': 1,
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
        ],
        'employees': [
            {
                'id': 'emp1',
                'first_name': 'Anna',
                'last_name': 'Kowalska',
                'employment_type': 'full',
                'max_hours': 176,
                'is_active': True,
                'position': 'Manager',
            },
            {
                'id': 'emp2',
                'first_name': 'Jan',
                'last_name': 'Nowak',
                'employment_type': 'full',
                'max_hours': 176,
                'is_active': True,
            },
            {
                'id': 'emp3',
                'first_name': 'Maria',
                'last_name': 'Wiśniewska',
                'employment_type': 'half',
                'max_hours': 88,
                'is_active': True,
            },
            {
                'id': 'emp4',
                'first_name': 'Piotr',
                'last_name': 'Zieliński',
                'employment_type': 'three_quarter',
                'max_hours': 132,
                'is_active': True,
            },
        ],
        'employee_preferences': [
            {
                'employee_id': 'emp1',
                'preferred_days': [0, 1, 2, 3, 4],
                'unavailable_days': [6],
            },
        ],
        'employee_absences': [
            {
                'employee_id': 'emp2',
                'start_date': '2026-02-16',
                'end_date': '2026-02-20',
                'absence_type': 'vacation',
            },
        ],
        'scheduling_rules': {
            'max_consecutive_days': 6,
            'min_daily_rest_hours': 11,
            'max_weekly_work_hours': 48,
        },
        'trading_sundays': [
            {'date': '2026-02-22', 'is_active': True},
        ],
        'solver_time_limit': 60,
    }
    
    print("🧪 TEST: Uruchamianie optymalizatora z przykładowymi danymi...")
    result = generate_schedule_optimized(test_data)
    
    print(f"\n📊 REZULTAT: {result['status']}")
    if result['status'] == 'SUCCESS':
        print(f"   Wygenerowano {len(result['shifts'])} zmian")
        print(f"   Jakość: {result['statistics']['quality_percent']}%")
        print(f"   Wartość celu: {result['statistics']['objective_value']:,}")
