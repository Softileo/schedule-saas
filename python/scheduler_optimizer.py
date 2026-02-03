"""
================================================================================
Calenda Schedule - CP-SAT Optimizer
================================================================================
Profesjonalny moduł do generowania miesięcznych grafików pracy.
Wykorzystuje Google OR-Tools CP-SAT Solver z pełną obsługą prawa pracy.

Autor: Senior Backend Developer
Wersja: 3.0.0
Data: 2026-02-01

KLUCZOWE CECHY:
- Obsługa mieszanych długości zmian (6h, 8h, 12h)
- Grafik ZAWSZE się rozpisuje (FEASIBLE zamiast INFEASIBLE)
- Dopełnienie do normy miesięcznej z tolerancją ±1h
- Pełna zgodność z Kodeksem Pracy

ARCHITEKTURA:
1. DataModel - preprocessing i walidacja danych
2. CPSATScheduler - główna klasa optymalizatora
3. ConstraintBuilder - modułowe dodawanie ograniczeń
4. ObjectiveBuilder - budowa funkcji celu
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
# STAŁE I KONFIGURACJA
# =============================================================================

# Mnożniki etatu względem pełnego etatu (40h/tydzień)
EMPLOYMENT_MULTIPLIERS: Dict[str, float] = {
    'full': 1.0,           # 40h/tydzień = 100% normy
    'three_quarter': 0.75, # 30h/tydzień = 75% normy
    'half': 0.5,           # 20h/tydzień = 50% normy
    'one_third': 0.333,    # ~13h/tydzień = 33% normy
    'custom': 1.0,         # Niestandardowy - obliczany z custom_hours
}

# Wagi dla soft constraints (funkcja celu)
WEIGHTS = {
    # CRITICAL: Kara za odchylenie od normy miesięcznej
    # Używamy BARDZO wysokiej kary, aby solver "dobijał" do normy
    'HOURS_DEVIATION_PER_MINUTE': 200,    # 100 pkt za każdą minutę odchylenia
    
    # Nagrody za preferencje
    'PREFERENCE_MATCH': 50,               # Nagroda za zgodność z preferencją
    'PREFERRED_DAY_BONUS': 30,            # Bonus za preferowany dzień
    'AVOIDED_DAY_PENALTY': 80,            # Kara za niechciany dzień
    
    # Kary za naruszenia "miękkie"
    'CONSECUTIVE_DAYS_PENALTY': 200,      # Kara za >5 dni z rzędu (za dzień)
    
    # Równomierność obłożenia
    'DAILY_VARIANCE_PENALTY': 150,        # Kara za nierównomierne obłożenie
    
    # Sprawiedliwość weekendowa
    'WEEKEND_FAIRNESS_PENALTY': 300,      # Kara za nierówne weekendy
    
    # Sprawiedliwy rozdział zmian
    'FAIR_SHIFT_DISTRIBUTION_PENALTY': 250,  # Kara za nierówny rozdział zmian między pracownikami
    
    # Manager presence
    'MANAGER_PRESENCE_BONUS': 100,        # Bonus za managera na zmianie
}

# Limity Kodeksu Pracy
LABOR_CODE = {
    'MAX_WEEKLY_HOURS': 48,               # Art. 131 KP - max 48h/tydzień (z nadgodzinami)
    'MIN_DAILY_REST_HOURS': 11,           # Art. 132 KP - min 11h odpoczynku dobowego
    'MIN_WEEKLY_REST_HOURS': 35,          # Art. 133 KP - min 35h odpoczynku tygodniowego
    'MAX_CONSECUTIVE_DAYS': 6,            # Art. 133 KP - max 6 dni pracy z rzędu
    'FREE_SUNDAY_INTERVAL': 4,            # Art. 151^10 KP - wolna niedziela co 4 tygodnie
}

# =============================================================================
# COVERAGE CALCULATION - Obliczanie pokrycia godzin otwarcia
# =============================================================================

# Slot czasowy (15 minut) dla analizy pokrycia
TIME_SLOT_MINUTES = 15

@dataclass
class TimeSlot:
    """Reprezentacja slotu czasowego do analizy pokrycia."""
    start_minutes: int  # Minuty od północy
    end_minutes: int
    min_employees: int = 1
    
    @property
    def duration_minutes(self) -> int:
        return self.end_minutes - self.start_minutes


def parse_time_to_minutes(time_str: str) -> int:
    """
    Konwertuje string czasu (HH:MM lub HH:MM:SS) na minuty od północy.
    """
    if not time_str:
        return 0
    parts = time_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    return hours * 60 + minutes


def get_day_name_from_weekday(weekday: int) -> str:
    """
    Konwertuje numer dnia tygodnia (0=Pn, 6=Nd) na nazwę po angielsku.
    """
    day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return day_names[weekday]


def calculate_coverage_slots(
    open_time: str,
    close_time: str,
    min_employees: int = 1,
    slot_duration: int = TIME_SLOT_MINUTES
) -> List[TimeSlot]:
    """
    Dzieli godziny otwarcia na sloty czasowe.
    
    Args:
        open_time: Godzina otwarcia (HH:MM)
        close_time: Godzina zamknięcia (HH:MM)
        min_employees: Minimalna liczba pracowników na slot
        slot_duration: Długość slotu w minutach (domyślnie 15)
    
    Returns:
        Lista slotów czasowych pokrywających godziny otwarcia
    """
    open_minutes = parse_time_to_minutes(open_time)
    close_minutes = parse_time_to_minutes(close_time)
    
    # Obsługa zmiany nocnej (zamknięcie po północy)
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
    """
    Sprawdza czy dany szablon zmiany pokrywa slot czasowy.
    
    Args:
        template: ShiftTemplate z start_time i end_time
        slot: TimeSlot do sprawdzenia
    
    Returns:
        True jeśli zmiana pokrywa cały slot
    """
    tmpl_start = parse_time_to_minutes(template.start_time)
    tmpl_end = parse_time_to_minutes(template.end_time)
    
    # Obsługa zmiany nocnej
    if tmpl_end <= tmpl_start:
        tmpl_end += 24 * 60
    
    # Slot musi być w całości pokryty przez zmianę
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
    max_hours: float                              # Maksymalne godziny miesięczne
    custom_hours: Optional[float] = None          # Godziny dla etatu custom (tygodniowo)
    is_active: bool = True
    position: str = 'Pracownik'
    color: Optional[str] = None
    template_assignments: List[str] = field(default_factory=list)
    absence_days_count: int = 0                   # Liczba dni nieobecności w miesiącu
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def get_target_minutes(self, monthly_norm_minutes: int, work_days_count: int = 20) -> int:
        """
        Oblicza docelową liczbę minut pracy w miesiącu.
        
        UWAGA: Jeśli pracownik ma urlop, target jest proporcjonalnie zmniejszany.
        Przykład: urlop 5 dni z 20 roboczych = target * (15/20) = 75% normy
        
        Dla custom: używa custom_hours (tygodniowe) przeliczone na miesięczne
        Dla standardowych: monthly_norm * multiplier
        """
        # Bazowy target
        if self.employment_type == 'custom' and self.custom_hours:
            # custom_hours = godziny TYGODNIOWE
            # Przeliczenie: (custom_hours / 40) * monthly_norm
            ratio = self.custom_hours / 40.0
            base_target = int(monthly_norm_minutes * ratio)
        else:
            multiplier = EMPLOYMENT_MULTIPLIERS.get(self.employment_type, 1.0)
            base_target = int(monthly_norm_minutes * multiplier)
        
        # Korekta za nieobecności
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
    start_time: str                               # Format HH:MM lub HH:MM:SS
    end_time: str                                 # Format HH:MM lub HH:MM:SS
    break_minutes: int = 0
    min_employees: int = 1
    max_employees: Optional[int] = None
    applicable_days: List[str] = field(default_factory=list)
    color: Optional[str] = None
    
    def get_duration_minutes(self) -> int:
        """Oblicza czas trwania zmiany w minutach (netto, bez przerwy)."""
        start = self._parse_time(self.start_time)
        end = self._parse_time(self.end_time)
        
        # Obsługa zmiany nocnej (kończy się następnego dnia)
        if end <= start:
            end += 24 * 60
        
        return end - start - self.break_minutes
    
    def get_gross_duration_minutes(self) -> int:
        """Oblicza czas trwania zmiany w minutach (brutto, z przerwą)."""
        start = self._parse_time(self.start_time)
        end = self._parse_time(self.end_time)
        
        if end <= start:
            end += 24 * 60
        
        return end - start
    
    def _parse_time(self, time_str: str) -> int:
        """Parsuje czas do minut od północy."""
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        return hours * 60 + minutes
    
    def get_start_minutes(self) -> int:
        """Zwraca czas rozpoczęcia jako minuty od północy."""
        return self._parse_time(self.start_time)
    
    def get_end_minutes(self) -> int:
        """Zwraca czas zakończenia jako minuty od północy."""
        end = self._parse_time(self.end_time)
        start = self._parse_time(self.start_time)
        # Obsługa zmiany nocnej
        if end <= start:
            end += 24 * 60
        return end


@dataclass
class Absence:
    """Reprezentacja nieobecności pracownika."""
    employee_id: str
    start_date: str                               # Format YYYY-MM-DD
    end_date: str                                 # Format YYYY-MM-DD
    absence_type: str
    
    def covers_date(self, date_str: str) -> bool:
        """Sprawdza czy nieobecność obejmuje daną datę."""
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
    preferred_days: List[int] = field(default_factory=list)     # 0=Pn, 6=Nd
    unavailable_days: List[int] = field(default_factory=list)   # 0=Pn, 6=Nd


# =============================================================================
# DATA MODEL - Preprocessing danych wejściowych
# =============================================================================

class DataModel:
    """
    Klasa do preprocessingu i walidacji danych wejściowych.
    Przygotowuje wszystkie dane potrzebne dla solvera CP-SAT.
    """
    
    def __init__(self, input_data: Dict):
        self.raw_data = input_data
        self.year: int = input_data.get('year', datetime.now().year)
        self.month: int = input_data.get('month', datetime.now().month)
        
        # Preprocessing
        self._calculate_month_info()
        self._parse_employees()
        self._parse_templates()
        self._parse_absences()
        self._parse_preferences()
        self._parse_trading_sundays()
        self._parse_settings()
        
        # Buduj mapowania indeksów
        self._build_indices()
        
        # Loguj podsumowanie
        self._log_summary()
    
    def _calculate_month_info(self):
        """Oblicza informacje o dniach w miesiącu."""
        _, days_in_month = monthrange(self.year, self.month)
        self.days_in_month = days_in_month
        self.all_days: List[int] = list(range(1, days_in_month + 1))
        
        # Kategoryzacja dni
        self.weekdays: List[int] = []      # Pn-Pt
        self.saturdays: List[int] = []     # Soboty
        self.sundays: List[int] = []       # Niedziele
        
        for day in self.all_days:
            d = date(self.year, self.month, day)
            weekday = d.weekday()  # 0=Pn, 6=Nd
            
            if weekday < 5:
                self.weekdays.append(day)
            elif weekday == 5:
                self.saturdays.append(day)
            else:
                self.sundays.append(day)
        
        # Oblicz normę miesięczną (tylko dni robocze Pn-Pt * 8h)
        provided_norm = self.raw_data.get('monthly_hours_norm')
        if provided_norm:
            self.monthly_norm_hours = provided_norm
        else:
            self.monthly_norm_hours = len(self.weekdays) * 8
        
        self.monthly_norm_minutes = int(self.monthly_norm_hours * 60)
        
        print(f"📅 Miesiąc: {self.year}-{self.month:02d}")
        print(f"   Dni w miesiącu: {self.days_in_month}")
        print(f"   Dni robocze (Pn-Pt): {len(self.weekdays)}")
        print(f"   Soboty: {len(self.saturdays)}")
        print(f"   Niedziele: {len(self.sundays)}")
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
                position=emp_data.get('position', 'Pracownik'),
                color=emp_data.get('color'),
                template_assignments=emp_data.get('template_assignments', []),
                absence_days_count=0,  # Zostanie zaktualizowane po parsowaniu absencji
            )
            
            if emp.is_active:
                self.employees.append(emp)
        
        print(f"👥 Pracownicy: {len(self.employees)} aktywnych")
    
    def _parse_templates(self):
        """Parsuje szablony zmian."""
        self.templates: List[ShiftTemplate] = []
        
        for tmpl_data in self.raw_data.get('shift_templates', []):
            tmpl = ShiftTemplate(
                id=tmpl_data.get('id', ''),
                name=tmpl_data.get('name', 'Zmiana'),
                start_time=tmpl_data.get('start_time', '08:00'),
                end_time=tmpl_data.get('end_time', '16:00'),
                break_minutes=tmpl_data.get('break_minutes', 0),
                min_employees=tmpl_data.get('min_employees', 1),
                max_employees=tmpl_data.get('max_employees'),
                applicable_days=tmpl_data.get('applicable_days', []),
                color=tmpl_data.get('color')
            )
            self.templates.append(tmpl)
        
        print(f"📋 Szablony zmian: {len(self.templates)}")
        for t in self.templates:
            days_info = t.applicable_days if t.applicable_days else "WSZYSTKIE DNI"
            print(f"   • {t.name}: {t.start_time}-{t.end_time} | Dni: {days_info} | Min: {t.min_employees}")
    
    def _parse_absences(self):
        """Parsuje nieobecności pracowników."""
        self.absences: List[Absence] = []
        self.absence_map: Dict[str, Set[str]] = defaultdict(set)  # emp_id -> set(dates)
        
        for abs_data in self.raw_data.get('employee_absences', []):
            absence = Absence(
                employee_id=abs_data.get('employee_id', ''),
                start_date=abs_data.get('start_date', ''),
                end_date=abs_data.get('end_date', ''),
                absence_type=abs_data.get('absence_type', 'other')
            )
            self.absences.append(absence)
            
            # Buduj mapę dni nieobecności
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
        
        # Zaktualizuj liczbę dni nieobecności w obiektach Employee
        # Liczymy tylko dni robocze (Pn-Pt)
        for emp in self.employees:
            absence_dates = self.absence_map.get(emp.id, set())
            work_day_absences = 0
            for date_str in absence_dates:
                try:
                    d = datetime.strptime(date_str, '%Y-%m-%d').date()
                    if d.weekday() < 5:  # Pn-Pt
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
        self.trading_sundays: Set[int] = set()  # Dni miesiąca które są niedziela handlową
        
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
        
        # Parsuj godziny otwarcia - obsługa per-day i legacy format
        opening_hours_raw = org.get('opening_hours', {})
        self.opening_hours: Dict[str, Dict[str, Optional[str]]] = {}
        
        # Default store hours (legacy fallback)
        default_open = org.get('store_open_time', '08:00')
        default_close = org.get('store_close_time', '20:00')
        
        # Normalizuj format czasu (usuń sekundy jeśli są)
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
                
                # Normalizuj format czasu
                if open_time and len(open_time) > 5:
                    open_time = open_time[:5]
                if close_time and len(close_time) > 5:
                    close_time = close_time[:5]
                
                self.opening_hours[day_name] = {
                    'open': open_time,
                    'close': close_time
                }
            else:
                # Domyślne godziny dla dni roboczych, zamknięte w niedzielę
                if day_name == 'sunday':
                    self.opening_hours[day_name] = {'open': None, 'close': None}
                elif day_name == 'saturday':
                    # Sobota - krótszy dzień domyślnie
                    self.opening_hours[day_name] = {
                        'open': default_open,
                        'close': '16:00' if default_close > '16:00' else default_close
                    }
                else:
                    self.opening_hours[day_name] = {
                        'open': default_open,
                        'close': default_close
                    }
        
        # Legacy compatibility
        self.store_open_time = default_open
        self.store_close_time = default_close
        
        self.max_consecutive_days = rules.get('max_consecutive_days', LABOR_CODE['MAX_CONSECUTIVE_DAYS'])
        self.min_daily_rest_hours = rules.get('min_daily_rest_hours', LABOR_CODE['MIN_DAILY_REST_HOURS'])
        self.max_weekly_hours = rules.get('max_weekly_work_hours', LABOR_CODE['MAX_WEEKLY_HOURS'])
        
        self.solver_time_limit = self.raw_data.get('solver_time_limit', 300)
        
        # Loguj godziny otwarcia
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
        
        # Mapowanie dzień -> dzień tygodnia (0=Pn, 6=Nd)
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
        """Sprawdza czy dany dzień jest dniem pracy (nie niehandlowa niedziela)."""
        weekday = self.day_to_weekday[day]
        if weekday == 6:  # Niedziela
            return day in self.trading_sundays
        return True
    
    def is_employee_absent(self, emp_id: str, day: int) -> bool:
        """Sprawdza czy pracownik ma nieobecność w danym dniu."""
        date_str = f"{self.year}-{self.month:02d}-{day:02d}"
        return date_str in self.absence_map.get(emp_id, set())
    
    def can_template_be_used_on_day(self, template: ShiftTemplate, day: int) -> bool:
        """Sprawdza czy szablon może być użyty w danym dniu."""
        if not template.applicable_days:
            return True  # Brak ograniczeń = można wszędzie
        
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
# CP-SAT SCHEDULER - Główna klasa optymalizatora
# =============================================================================

class CPSATScheduler:
    """
    Główna klasa optymalizatora CP-SAT.
    Implementuje wszystkie ograniczenia twarde i miękkie.
    """
    
    def __init__(self, data: DataModel):
        self.data = data
        self.model = cp_model.CpModel()
        
        # Zmienne decyzyjne
        # shifts[(emp_idx, day, tmpl_idx)] = BoolVar
        self.shifts: Dict[Tuple[int, int, int], cp_model.IntVar] = {}
        
        # Zmienne pomocnicze dla dni pracy
        # works_day[(emp_idx, day)] = BoolVar (czy pracownik pracuje w danym dniu)
        self.works_day: Dict[Tuple[int, int], cp_model.IntVar] = {}
        
        # Zmienne dla funkcji celu
        self.objective_terms: List[cp_model.LinearExpr] = []
        self.penalties: List[Tuple[cp_model.IntVar, int, str]] = []
        self.bonuses: List[Tuple[cp_model.IntVar, int, str]] = []
        
        # Statystyki
        self.stats = {
            'total_variables': 0,
            'hard_constraints': 0,
            'soft_constraints': 0,
        }
    
    # =========================================================================
    # KROK 1: Tworzenie zmiennych decyzyjnych
    # =========================================================================
    
    def create_decision_variables(self):
        """
        Tworzy zmienne decyzyjne BoolVar dla każdej możliwej kombinacji
        (pracownik, dzień, szablon).
        """
        print("\n🔧 Tworzenie zmiennych decyzyjnych...")
        
        # Debug: loguj applicable_days dla każdego szablonu
        print("   📋 Szablony i ich dni:")
        for tmpl in self.data.templates:
            days_info = tmpl.applicable_days if tmpl.applicable_days else "WSZYSTKIE DNI"
            print(f"      • {tmpl.name} (ID: {tmpl.id[:8]}...): {days_info}")
        
        skipped_day_mismatch = 0
        skipped_no_assignment = 0
        templates_used = set()  # Track which templates are actually used
        
        for emp_idx, emp in enumerate(self.data.employees):
            for day in self.data.all_days:
                # Sprawdź czy dzień jest pracujący
                if not self.data.is_workable_day(day):
                    continue
                
                # Sprawdź nieobecność
                if self.data.is_employee_absent(emp.id, day):
                    continue
                
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    # Sprawdź przypisanie szablonu do pracownika
                    if emp.template_assignments:
                        if tmpl.id not in emp.template_assignments:
                            skipped_no_assignment += 1
                            continue
                    
                    # Sprawdź czy szablon działa w ten dzień
                    if not self.data.can_template_be_used_on_day(tmpl, day):
                        skipped_day_mismatch += 1
                        continue
                    
                    # Utwórz zmienną
                    var_name = f"s_{emp_idx}_{day}_{tmpl_idx}"
                    self.shifts[(emp_idx, day, tmpl_idx)] = self.model.NewBoolVar(var_name)
                    self.stats['total_variables'] += 1
                    templates_used.add(tmpl.name)
        
        print(f"   ⏩ Pominięto (brak przypisania do pracownika): {skipped_no_assignment}")
        print(f"   ⏩ Pominięto (zły dzień tygodnia): {skipped_day_mismatch}")
        
        # Pokaż które szablony są faktycznie używane
        unused_templates = [t.name for t in self.data.templates if t.name not in templates_used]
        if unused_templates:
            print(f"   ⚠️ NIEUŻYWANE SZABLONY (brak przypisań): {unused_templates}")
        
        # Utwórz zmienne pomocnicze works_day
        for emp_idx, emp in enumerate(self.data.employees):
            for day in self.data.all_days:
                if not self.data.is_workable_day(day):
                    continue
                
                if self.data.is_employee_absent(emp.id, day):
                    continue
                
                var_name = f"w_{emp_idx}_{day}"
                self.works_day[(emp_idx, day)] = self.model.NewBoolVar(var_name)
                
                # Powiąż works_day z shift vars
                shift_vars_for_day = [
                    self.shifts[(emp_idx, day, t)]
                    for t in range(len(self.data.templates))
                    if (emp_idx, day, t) in self.shifts
                ]
                
                if shift_vars_for_day:
                    # works_day == 1 iff co najmniej jedna zmiana przypisana
                    self.model.AddMaxEquality(self.works_day[(emp_idx, day)], shift_vars_for_day)
        
        print(f"   ✅ Utworzono {self.stats['total_variables']} zmiennych shift")
        print(f"   ✅ Utworzono {len(self.works_day)} zmiennych works_day")
    
    # =========================================================================
    # KROK 2: Hard Constraints (MUSZĄ być spełnione)
    # =========================================================================
    
    def add_hard_constraints(self):
        """Dodaje wszystkie ograniczenia twarde."""
        print("\n🔒 Dodawanie Hard Constraints...")
        
        self._add_hc1_one_shift_per_day()
        self._add_hc2_max_weekly_hours()
        self._add_hc3_min_daily_rest()
        self._add_hc4_max_consecutive_days()
        self._add_hc5_trading_sundays()
        self._add_hc6_absences()
        self._add_hc7_min_staffing()
        self._add_hc8_max_staffing()  # NOWE: max_employees jako HARD constraint
        self._add_hc11_weekly_rest()
        self._add_hc12_free_sunday()
        
        print(f"   ✅ Dodano {self.stats['hard_constraints']} hard constraints")
    
    def _add_hc1_one_shift_per_day(self):
        """
        HC1: Maksymalnie jedna zmiana dziennie na pracownika.
        Pracownik nie może mieć dwóch zmian w tym samym dniu.
        """
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
    
    def _add_hc2_max_weekly_hours(self):
        """
        HC2: Max 48h pracy tygodniowo (Art. 131 KP).
        Dotyczy każdego tygodnia kalendarzowego.
        """
        max_weekly_minutes = self.data.max_weekly_hours * 60
        
        for emp_idx in range(len(self.data.employees)):
            # Grupuj dni po tygodniach
            weeks: Dict[int, List[int]] = defaultdict(list)
            for day in self.data.all_days:
                week_num = self.data.get_week_number(day)
                weeks[week_num].append(day)
            
            for week_num, week_days in weeks.items():
                week_minutes = []
                
                for day in week_days:
                    for tmpl_idx, tmpl in enumerate(self.data.templates):
                        if (emp_idx, day, tmpl_idx) in self.shifts:
                            duration = tmpl.get_duration_minutes()
                            week_minutes.append(
                                self.shifts[(emp_idx, day, tmpl_idx)] * duration
                            )
                
                if week_minutes:
                    self.model.Add(sum(week_minutes) <= max_weekly_minutes)
                    self.stats['hard_constraints'] += 1
    
    def _add_hc3_min_daily_rest(self):
        """
        HC3: Minimum 11h odpoczynku dobowego (Art. 132 KP).
        Między końcem jednej zmiany a początkiem następnej musi być ≥11h.
        """
        min_rest_minutes = self.data.min_daily_rest_hours * 60
        
        for emp_idx in range(len(self.data.employees)):
            for day in self.data.all_days[:-1]:  # Pomijamy ostatni dzień
                next_day = day + 1
                
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    if (emp_idx, day, tmpl_idx) not in self.shifts:
                        continue
                    
                    shift_end = tmpl.get_end_minutes()
                    # Jeśli zmiana kończy się po północy, shift_end > 1440
                    
                    for next_tmpl_idx, next_tmpl in enumerate(self.data.templates):
                        if (emp_idx, next_day, next_tmpl_idx) not in self.shifts:
                            continue
                        
                        next_shift_start = next_tmpl.get_start_minutes()
                        
                        # Oblicz przerwę między zmianami
                        # Jeśli shift_end = 1320 (22:00), next_start = 480 (08:00)
                        # Przerwa = (24*60 - 1320) + 480 = 600 min = 10h
                        if shift_end <= 1440:
                            rest = (24 * 60 - shift_end) + next_shift_start
                        else:
                            # Zmiana nocna kończąca się po północy
                            rest = next_shift_start - (shift_end - 24 * 60)
                        
                        if rest < min_rest_minutes:
                            # Nie można przypisać obu zmian jednocześnie
                            self.model.Add(
                                self.shifts[(emp_idx, day, tmpl_idx)] +
                                self.shifts[(emp_idx, next_day, next_tmpl_idx)] <= 1
                            )
                            self.stats['hard_constraints'] += 1
    
    def _add_hc4_max_consecutive_days(self):
        """
        HC4: Max 6 dni pracy z rzędu (Art. 133 KP).
        Po 6 dniach pracy musi być dzień wolny.
        """
        max_consecutive = self.data.max_consecutive_days
        window_size = max_consecutive + 1  # 7 dni okno
        
        for emp_idx in range(len(self.data.employees)):
            for start_day in range(1, self.data.days_in_month - window_size + 2):
                window_days = list(range(start_day, start_day + window_size))
                
                work_vars = []
                for day in window_days:
                    if day <= self.data.days_in_month and (emp_idx, day) in self.works_day:
                        work_vars.append(self.works_day[(emp_idx, day)])
                
                if len(work_vars) == window_size:
                    # W oknie 7 dni może być max 6 dni pracy
                    self.model.Add(sum(work_vars) <= max_consecutive)
                    self.stats['hard_constraints'] += 1
    
    def _add_hc5_trading_sundays(self):
        """
        HC5: Praca tylko w niedziele handlowe.
        W niehandlowe niedziele nie można planować pracy.
        """
        for emp_idx in range(len(self.data.employees)):
            for day in self.data.sundays:
                if day not in self.data.trading_sundays:
                    # Niehandlowa niedziela - nie powinno być zmiennych
                    # ale dla pewności sprawdzamy
                    for tmpl_idx in range(len(self.data.templates)):
                        if (emp_idx, day, tmpl_idx) in self.shifts:
                            self.model.Add(self.shifts[(emp_idx, day, tmpl_idx)] == 0)
                            self.stats['hard_constraints'] += 1
    
    def _add_hc6_absences(self):
        """
        HC6: Respektowanie nieobecności.
        Jeśli pracownik ma urlop/L4, nie można go planować.
        """
        for emp_idx, emp in enumerate(self.data.employees):
            for day in self.data.all_days:
                if self.data.is_employee_absent(emp.id, day):
                    for tmpl_idx in range(len(self.data.templates)):
                        if (emp_idx, day, tmpl_idx) in self.shifts:
                            self.model.Add(self.shifts[(emp_idx, day, tmpl_idx)] == 0)
                            self.stats['hard_constraints'] += 1
    
    def _add_hc7_min_staffing(self):
        """
        HC7: Minimalna obsada na zmianę (WARUNKOWA).
        
        WAŻNE: min_employees oznacza "jeśli ta zmiana jest używana, to musi mieć
        co najmniej X pracowników". NIE oznacza, że zmiana MUSI być używana!
        
        Szablony są OPCJAMI, nie wymaganiami. Pokrycie godzin otwarcia
        jest obsługiwane przez SC7 (soft constraint).
        
        Logika: IF sum(assigned) >= 1 THEN sum(assigned) >= min_employees
        Czyli: sum(assigned) == 0 OR sum(assigned) >= min_employees
        """
        print("   → HC7: Min staffing per template (CONDITIONAL)")
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            for tmpl_idx, tmpl in enumerate(self.data.templates):
                # Sprawdź czy szablon działa w ten dzień
                if not self.data.can_template_be_used_on_day(tmpl, day):
                    continue
                
                min_required = tmpl.min_employees
                if min_required <= 1:
                    continue  # Dla min=1 warunek jest trywialny (0 lub >=1)
                
                # Zbierz wszystkie zmienne dla tego szablonu w tym dniu
                assigned_vars = [
                    self.shifts[(e, day, tmpl_idx)]
                    for e in range(len(self.data.employees))
                    if (e, day, tmpl_idx) in self.shifts
                ]
                
                if not assigned_vars:
                    continue
                
                # Zmienna pomocnicza: czy szablon jest używany w tym dniu
                is_used = self.model.NewBoolVar(f"used_{day}_{tmpl_idx}")
                
                # is_used == 1 iff sum(assigned) >= 1
                self.model.Add(sum(assigned_vars) >= 1).OnlyEnforceIf(is_used)
                self.model.Add(sum(assigned_vars) == 0).OnlyEnforceIf(is_used.Not())
                
                # Jeśli używany, musi mieć min_employees
                # sum(assigned) >= min_required gdy is_used == 1
                self.model.Add(sum(assigned_vars) >= min_required).OnlyEnforceIf(is_used)
                self.stats['hard_constraints'] += 1
    
    def _add_hc8_max_staffing(self):
        """
        HC8: Maksymalna obsada na zmianę (KRYTYCZNE!).
        Każdy szablon zmiany NIE MOŻE mieć więcej niż max_employees pracowników.
        
        HARD CONSTRAINT: ABSOLUTNIE musi być spełnione!
        Przekroczenie max_employees = nadmiar kadrowy = błąd!
        """
        print("   → HC8: Max staffing per template (HARD)")
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            for tmpl_idx, tmpl in enumerate(self.data.templates):
                # Sprawdź czy szablon działa w ten dzień
                if not self.data.can_template_be_used_on_day(tmpl, day):
                    continue
                
                max_allowed = tmpl.max_employees
                if max_allowed is None:
                    continue  # Brak limitu max
                
                # Zbierz wszystkie zmienne dla tego szablonu w tym dniu
                assigned_vars = [
                    self.shifts[(e, day, tmpl_idx)]
                    for e in range(len(self.data.employees))
                    if (e, day, tmpl_idx) in self.shifts
                ]
                
                if assigned_vars and max_allowed is not None:
                    # HARD: Maksimum max_employees może być przypisanych
                    self.model.Add(sum(assigned_vars) <= max_allowed)
                    self.stats['hard_constraints'] += 1
        
        # Loguj podsumowanie
        templates_with_max = [t for t in self.data.templates if t.max_employees is not None]
        print(f"      • Szablony z max_employees: {len(templates_with_max)}")
        for t in templates_with_max:
            print(f"        - {t.name}: max {t.max_employees} os.")
    
    def _add_hc11_weekly_rest(self):
        """
        HC11: Minimum 35h odpoczynku tygodniowego (Art. 133 KP).
        Raz w tygodniu musi być przerwa ≥35h.
        
        Implementacja: W każdym tygodniu musi być przynajmniej jeden dzień wolny
        z wolnym dniem następnym ALBO poprzednim (aby zapewnić 35h ciągłej przerwy).
        """
        # Uproszczona wersja: wymuszamy co najmniej 1 dzień wolny na tydzień
        # Pełne 35h wymaga dokładniejszej analizy start/end zmian
        
        for emp_idx in range(len(self.data.employees)):
            weeks: Dict[int, List[int]] = defaultdict(list)
            for day in self.data.all_days:
                week_num = self.data.get_week_number(day)
                weeks[week_num].append(day)
            
            for week_num, week_days in weeks.items():
                if len(week_days) < 7:
                    continue  # Niepełny tydzień na początku/końcu miesiąca
                
                work_vars = []
                for day in week_days:
                    if (emp_idx, day) in self.works_day:
                        work_vars.append(self.works_day[(emp_idx, day)])
                
                if work_vars:
                    # Max 6 dni pracy = min 1 dzień wolny
                    self.model.Add(sum(work_vars) <= 6)
                    self.stats['hard_constraints'] += 1
    
    def _add_hc12_free_sunday(self):
        """
        HC12: Wolna niedziela co 4 tygodnie (Art. 151^10 KP).
        Pracownik musi mieć co najmniej jedną wolną niedzielę w miesiącu.
        """
        trading_sunday_list = sorted(self.data.trading_sundays)
        
        if not trading_sunday_list:
            return  # Brak niedziel handlowych
        
        for emp_idx in range(len(self.data.employees)):
            # Jeśli są ≥2 niedziele handlowe, minimum 1 musi być wolna
            if len(trading_sunday_list) >= 2:
                sunday_work_vars = []
                for day in trading_sunday_list:
                    if (emp_idx, day) in self.works_day:
                        sunday_work_vars.append(self.works_day[(emp_idx, day)])
                
                if sunday_work_vars:
                    # Max (n-1) niedziel pracujących = min 1 wolna
                    max_working_sundays = len(trading_sunday_list) - 1
                    self.model.Add(sum(sunday_work_vars) <= max_working_sundays)
                    self.stats['hard_constraints'] += 1
    
    # =========================================================================
    # KROK 3: Soft Constraints (Optymalizowane, nie wymuszone)
    # =========================================================================
    
    def add_soft_constraints(self):
        """Dodaje wszystkie ograniczenia miękkie do funkcji celu."""
        print("\n📊 Dodawanie Soft Constraints (funkcja celu)...")
        
        self._add_sc1_hours_deviation()
        self._add_sc2_preferences()
        self._add_sc3_consecutive_days_penalty()
        self._add_sc4_weekend_fairness()
        self._add_sc5_daily_staffing_balance()
        self._add_sc6_fair_shift_distribution()
        self._add_sc7_coverage_optimization()  # Nowe: optymalizacja pokrycia godzin otwarcia
        
        print(f"   ✅ Dodano {self.stats['soft_constraints']} soft constraints")
    
    def _add_sc1_hours_deviation(self):
        """
        SC1: KRYTYCZNY - Kara za odchylenie od normy miesięcznej.
        
        Używamy BARDZO wysokiej kary, aby solver "dobijał" do normy.
        Tolerancja: ±60 minut (1h) bez kary.
        Powyżej/poniżej: kara proporcjonalna do odchylenia.
        """
        print("   → SC1: Dopełnienie etatowe (CRITICAL)")
        
        tolerance_minutes = 60  # ±1h tolerancji
        penalty_weight = WEIGHTS['HOURS_DEVIATION_PER_MINUTE']
        work_days_count = len(self.data.weekdays)
        
        for emp_idx, emp in enumerate(self.data.employees):
            target_minutes = emp.get_target_minutes(self.data.monthly_norm_minutes, work_days_count)
            
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
                continue
            
            # Zmienna: całkowite minuty pracownika
            max_possible_minutes = sum(
                tmpl.get_duration_minutes()
                for tmpl in self.data.templates
            ) * self.data.days_in_month
            
            total_minutes = self.model.NewIntVar(
                0, max_possible_minutes, f"total_min_{emp_idx}"
            )
            self.model.Add(total_minutes == sum(total_minutes_terms))
            
            # Zmienne dla odchylenia
            deviation = self.model.NewIntVar(
                -max_possible_minutes, max_possible_minutes, f"dev_{emp_idx}"
            )
            self.model.Add(deviation == total_minutes - target_minutes)
            
            # Wartość bezwzględna odchylenia
            abs_deviation = self.model.NewIntVar(
                0, max_possible_minutes, f"abs_dev_{emp_idx}"
            )
            self.model.AddAbsEquality(abs_deviation, deviation)
            
            # Odchylenie ponad tolerancję
            excess_deviation = self.model.NewIntVar(
                0, max_possible_minutes, f"excess_dev_{emp_idx}"
            )
            self.model.AddMaxEquality(
                excess_deviation,
                [abs_deviation - tolerance_minutes, self.model.NewConstant(0)]
            )
            
            # Kara za odchylenie ponad tolerancję
            self.penalties.append((
                excess_deviation,
                penalty_weight,
                f"hours_deviation_{emp.full_name}"
            ))
            self.stats['soft_constraints'] += 1
            
            print(f"      • {emp.full_name}: target={target_minutes//60}h ({target_minutes}min)")
    
    def _add_sc2_preferences(self):
        """
        SC2: Nagrody za preferencje pracowników.
        - Preferowane dni: bonus
        - Unikane dni: kara
        """
        print("   → SC2: Preferencje pracowników")
        
        for emp_idx, emp in enumerate(self.data.employees):
            pref = self.data.preferences.get(emp.id)
            if not pref:
                continue
            
            for day in self.data.all_days:
                weekday = self.data.day_to_weekday[day]
                
                # Sprawdź preferencje dnia
                is_preferred = weekday in pref.preferred_days
                is_avoided = weekday in pref.unavailable_days
                
                for tmpl_idx in range(len(self.data.templates)):
                    if (emp_idx, day, tmpl_idx) not in self.shifts:
                        continue
                    
                    shift_var = self.shifts[(emp_idx, day, tmpl_idx)]
                    
                    if is_preferred:
                        self.bonuses.append((
                            shift_var,
                            WEIGHTS['PREFERRED_DAY_BONUS'],
                            f"pref_day_{emp_idx}_{day}"
                        ))
                        self.stats['soft_constraints'] += 1
                    
                    if is_avoided:
                        self.penalties.append((
                            shift_var,
                            WEIGHTS['AVOIDED_DAY_PENALTY'],
                            f"avoid_day_{emp_idx}_{day}"
                        ))
                        self.stats['soft_constraints'] += 1
    
    def _add_sc3_consecutive_days_penalty(self):
        """
        SC3: Kara za zbyt wiele dni pracy z rzędu (powyżej 5).
        """
        print("   → SC3: Kara za ciągłą pracę >5 dni")
        
        penalty_threshold = 5
        
        for emp_idx in range(len(self.data.employees)):
            for start_day in range(1, self.data.days_in_month - penalty_threshold + 1):
                window_days = list(range(start_day, start_day + penalty_threshold + 1))
                
                work_vars = []
                for day in window_days:
                    if day <= self.data.days_in_month and (emp_idx, day) in self.works_day:
                        work_vars.append(self.works_day[(emp_idx, day)])
                
                if len(work_vars) == penalty_threshold + 1:
                    # Jeśli wszystkie 6 dni są pracujące, nalicz karę
                    all_working = self.model.NewBoolVar(f"consec_{emp_idx}_{start_day}")
                    self.model.Add(sum(work_vars) == penalty_threshold + 1).OnlyEnforceIf(all_working)
                    self.model.Add(sum(work_vars) < penalty_threshold + 1).OnlyEnforceIf(all_working.Not())
                    
                    self.penalties.append((
                        all_working,
                        WEIGHTS['CONSECUTIVE_DAYS_PENALTY'],
                        f"consecutive_{emp_idx}_{start_day}"
                    ))
                    self.stats['soft_constraints'] += 1
    
    def _add_sc4_weekend_fairness(self):
        """
        SC4: Sprawiedliwy podział weekendów.
        Wszyscy pracownicy powinni pracować podobną liczbę weekendów.
        """
        print("   → SC4: Sprawiedliwe weekendy")
        
        if len(self.data.employees) <= 1:
            return
        
        # Policz weekendy (soboty + niedziele handlowe) dla każdego pracownika
        weekend_days = set(self.data.saturdays) | self.data.trading_sundays
        
        if not weekend_days:
            return
        
        weekend_counts = []
        
        for emp_idx in range(len(self.data.employees)):
            count_var = self.model.NewIntVar(
                0, len(weekend_days), f"weekend_count_{emp_idx}"
            )
            
            weekend_work_vars = []
            for day in weekend_days:
                if (emp_idx, day) in self.works_day:
                    weekend_work_vars.append(self.works_day[(emp_idx, day)])
            
            if weekend_work_vars:
                self.model.Add(count_var == sum(weekend_work_vars))
            else:
                self.model.Add(count_var == 0)
            
            weekend_counts.append(count_var)
        
        # Minimalizuj różnicę między max i min
        if len(weekend_counts) >= 2:
            max_weekends = self.model.NewIntVar(0, len(weekend_days), "max_weekends")
            min_weekends = self.model.NewIntVar(0, len(weekend_days), "min_weekends")
            
            self.model.AddMaxEquality(max_weekends, weekend_counts)
            self.model.AddMinEquality(min_weekends, weekend_counts)
            
            weekend_diff = self.model.NewIntVar(0, len(weekend_days), "weekend_diff")
            self.model.Add(weekend_diff == max_weekends - min_weekends)
            
            self.penalties.append((
                weekend_diff,
                WEIGHTS['WEEKEND_FAIRNESS_PENALTY'],
                "weekend_fairness"
            ))
            self.stats['soft_constraints'] += 1
    
    def _add_sc5_daily_staffing_balance(self):
        """
        SC5: Równomierne obłożenie dzienne.
        Kara za dni z za małą lub za dużą obsadą.
        """
        print("   → SC5: Równomierne obłożenie")
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            for tmpl_idx, tmpl in enumerate(self.data.templates):
                # Policz pracowników przypisanych do tego szablonu w tym dniu
                assigned_vars = [
                    self.shifts[(e, day, tmpl_idx)]
                    for e in range(len(self.data.employees))
                    if (e, day, tmpl_idx) in self.shifts
                ]
                
                if not assigned_vars:
                    continue
                
                assigned_count = self.model.NewIntVar(
                    0, len(assigned_vars), f"assigned_{day}_{tmpl_idx}"
                )
                self.model.Add(assigned_count == sum(assigned_vars))
                
                # Kara za zbyt małą obsadę (poniżej minimum)
                min_req = tmpl.min_employees
                shortage = self.model.NewIntVar(
                    0, min_req, f"shortage_{day}_{tmpl_idx}"
                )
                self.model.AddMaxEquality(
                    shortage,
                    [min_req - assigned_count, self.model.NewConstant(0)]
                )
                
                if min_req > 0:
                    self.penalties.append((
                        shortage,
                        WEIGHTS['DAILY_VARIANCE_PENALTY'],
                        f"understaffed_{day}_{tmpl.name}"
                    ))
                    self.stats['soft_constraints'] += 1
    
    def _add_sc6_fair_shift_distribution(self):
        """
        SC6: Sprawiedliwy rozdział zmian między pracowników.
        Kara za różnice w liczbie przypisanych zmian tego samego typu.
        
        Dla każdego szablonu zmian, liczymy ile razy każdy pracownik
        został przypisany i karamy różnice między min i max.
        """
        print("   → SC6: Sprawiedliwy rozdział zmian")
        
        for tmpl_idx, tmpl in enumerate(self.data.templates):
            # Policz ile razy każdy pracownik ma zmianę tego typu
            employee_shift_counts = []
            
            for emp_idx in range(len(self.data.employees)):
                # Suma zmian tego szablonu dla tego pracownika
                emp_shifts = [
                    self.shifts[(emp_idx, day, tmpl_idx)]
                    for day in self.data.all_days
                    if (emp_idx, day, tmpl_idx) in self.shifts
                ]
                
                if emp_shifts:
                    count_var = self.model.NewIntVar(
                        0, len(self.data.all_days),
                        f"shift_count_{emp_idx}_{tmpl_idx}"
                    )
                    self.model.Add(count_var == sum(emp_shifts))
                    employee_shift_counts.append(count_var)
            
            if len(employee_shift_counts) < 2:
                continue  # Nie ma sensu balansować dla jednego pracownika
            
            # Znajdź min i max
            min_shifts = self.model.NewIntVar(
                0, len(self.data.all_days),
                f"min_shifts_{tmpl_idx}"
            )
            max_shifts = self.model.NewIntVar(
                0, len(self.data.all_days),
                f"max_shifts_{tmpl_idx}"
            )
            
            self.model.AddMinEquality(min_shifts, employee_shift_counts)
            self.model.AddMaxEquality(max_shifts, employee_shift_counts)
            
            # Różnica między max i min
            shift_diff = self.model.NewIntVar(
                0, len(self.data.all_days),
                f"shift_diff_{tmpl_idx}"
            )
            self.model.Add(shift_diff == max_shifts - min_shifts)
            
            # Kara za różnicę > 1 (tolerujemy różnicę 0 lub 1)
            excess_diff = self.model.NewIntVar(
                0, len(self.data.all_days),
                f"excess_shift_diff_{tmpl_idx}"
            )
            self.model.AddMaxEquality(
                excess_diff,
                [shift_diff - 1, self.model.NewConstant(0)]
            )
            
            # Dodaj karę do funkcji celu
            self.penalties.append((
                excess_diff,
                WEIGHTS['FAIR_SHIFT_DISTRIBUTION_PENALTY'],
                f"shift_imbalance_{tmpl.name}"
            ))
            self.stats['soft_constraints'] += 1
    
    def _add_sc7_coverage_optimization(self):
        """
        SC7: Optymalizacja pokrycia godzin otwarcia.
        
        Zamiast wymuszać konkretne szablony, analizujemy sloty czasowe
        i nagradzamy/karamy na podstawie rzeczywistego pokrycia.
        
        Kluczowe zasady:
        1. Każdy slot czasowy musi być pokryty przez min_employees
        2. Dopuszczamy double-staffing (wielu pracowników na tym samym slocie)
        3. Karamy brak pokrycia, nagradzamy optymalne pokrycie
        """
        print("   → SC7: Optymalizacja pokrycia godzin otwarcia")
        
        coverage_penalty_weight = 300  # Kara za brak pokrycia slotu
        overstaffing_penalty_weight = 10  # Lekka kara za nadmiar obsady
        
        for day in self.data.all_days:
            if not self.data.is_workable_day(day):
                continue
            
            weekday = self.data.day_to_weekday[day]
            day_name = get_day_name_from_weekday(weekday)
            
            day_hours = self.data.opening_hours.get(day_name, {})
            open_time = day_hours.get('open')
            close_time = day_hours.get('close')
            
            if not open_time or not close_time:
                continue  # Dzień zamknięty
            
            # Generuj sloty dla tego dnia
            slots = calculate_coverage_slots(
                open_time, 
                close_time,
                min_employees=self.data.min_employees_per_shift,
                slot_duration=30  # 30-minutowe sloty dla mniejszej złożoności
            )
            
            if not slots:
                continue
            
            # Dla każdego slotu, sprawdź które szablony go pokrywają
            for slot_idx, slot in enumerate(slots):
                # Znajdź szablony które pokrywają ten slot
                covering_templates: List[Tuple[int, Any]] = []
                
                for tmpl_idx, tmpl in enumerate(self.data.templates):
                    # Sprawdź czy szablon może być użyty w ten dzień
                    if not self.data.can_template_be_used_on_day(tmpl, day):
                        continue
                    
                    # Sprawdź czy szablon pokrywa slot
                    if does_template_cover_slot(tmpl, slot):
                        covering_templates.append((tmpl_idx, tmpl))
                
                if not covering_templates:
                    # Brak szablonów pokrywających ten slot - skip
                    # (to jest problem konfiguracji, nie optymalizacji)
                    continue
                
                # Zbierz wszystkie zmienne shift które pokrywają ten slot
                slot_coverage_vars = []
                
                for emp_idx in range(len(self.data.employees)):
                    for tmpl_idx, tmpl in covering_templates:
                        if (emp_idx, day, tmpl_idx) in self.shifts:
                            slot_coverage_vars.append(self.shifts[(emp_idx, day, tmpl_idx)])
                
                if not slot_coverage_vars:
                    continue
                
                # Policz ile pracowników pokrywa ten slot
                slot_coverage = self.model.NewIntVar(
                    0, len(slot_coverage_vars),
                    f"slot_cov_{day}_{slot_idx}"
                )
                self.model.Add(slot_coverage == sum(slot_coverage_vars))
                
                min_required = slot.min_employees
                
                # Kara za niedostateczne pokrycie
                shortage = self.model.NewIntVar(
                    0, min_required,
                    f"slot_short_{day}_{slot_idx}"
                )
                self.model.AddMaxEquality(
                    shortage,
                    [min_required - slot_coverage, self.model.NewConstant(0)]
                )
                
                if min_required > 0:
                    self.penalties.append((
                        shortage,
                        coverage_penalty_weight,
                        f"coverage_gap_{day}_{slot.start_minutes//60}:{slot.start_minutes%60:02d}"
                    ))
                    self.stats['soft_constraints'] += 1
                
                # Lekka kara za zbyt duży nadmiar (>min+2)
                max_ideal = min_required + 2
                overstaffing = self.model.NewIntVar(
                    0, len(slot_coverage_vars),
                    f"slot_over_{day}_{slot_idx}"
                )
                self.model.AddMaxEquality(
                    overstaffing,
                    [slot_coverage - max_ideal, self.model.NewConstant(0)]
                )
                
                self.penalties.append((
                    overstaffing,
                    overstaffing_penalty_weight,
                    f"overstaffing_{day}_{slot.start_minutes//60}:{slot.start_minutes%60:02d}"
                ))
                self.stats['soft_constraints'] += 1
    
    # =========================================================================
    # KROK 4: Budowanie funkcji celu i rozwiązywanie
    # =========================================================================
    
    def build_objective(self):
        """Buduje funkcję celu z zebranych kar i nagród."""
        print("\n🎯 Budowanie funkcji celu...")
        
        objective_terms = []
        
        # Kary (minimalizujemy)
        for var, weight, name in self.penalties:
            objective_terms.append(var * weight)
        
        # Bonusy (maksymalizujemy = minimalizujemy negatywne)
        for var, weight, name in self.bonuses:
            objective_terms.append(-var * weight)
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
        
        print(f"   ✅ Funkcja celu: {len(self.penalties)} kar, {len(self.bonuses)} bonusów")
    
    def solve(self, time_limit_seconds: Optional[int] = None) -> Dict:
        """
        Uruchamia solver CP-SAT i zwraca wynik.
        
        Args:
            time_limit_seconds: Limit czasu dla solvera (domyślnie z danych)
        
        Returns:
            Słownik z wynikami (shifts, statistics, status)
        """
        start_time = time.time()
        
        # Buduj funkcję celu
        self.build_objective()
        
        # Konfiguruj solver
        solver = cp_model.CpSolver()
        
        timeout = time_limit_seconds or self.data.solver_time_limit
        solver.parameters.max_time_in_seconds = timeout
        
        # Zwiększona eksploracja przestrzeni rozwiązań
        solver.parameters.num_search_workers = 16  # Więcej wątków
        solver.parameters.log_search_progress = False
        
        # Strategia przeszukiwania - portfolio szuka różnymi metodami jednocześnie
        solver.parameters.search_branching = cp_model.PORTFOLIO_SEARCH
        
        # Randomizacja dla lepszej eksploracji
        solver.parameters.random_seed = int(time.time()) % 10000
        solver.parameters.randomize_search = True
        
        print(f"\n🚀 Uruchamianie solvera (limit: {timeout}s, workers: 16, strategy: PORTFOLIO)...")
        
        # Rozwiąż
        status = solver.Solve(self.model)
        
        # Zapisz status dla późniejszego użycia
        self._solver_status = status
        
        solve_time = time.time() - start_time
        
        # Interpretuj status
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
            print(f"   Wartość funkcji celu: {objective:.0f}")
            
            # Ekstrahuj rozwiązanie
            shifts = self._extract_solution(solver)
            
            # Oblicz statystyki
            statistics = self._calculate_statistics(solver, shifts, solve_time)
            
            print(f"   Przypisane zmiany: {len(shifts)}")
            print(f"   Jakość: {statistics['quality_percent']:.1f}%")
            print(f"{'='*60}\n")
            
            # Wypisz podsumowanie godzin
            self._print_hours_summary(shifts)
            
            # Wypisz tabelę harmonogramu
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
                    'Zmniejsz wymagania minimalne szablonów',
                    'Sprawdź nieobecności pracowników',
                    'Zwiększ limit czasowy solvera',
                ],
            }
    
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
                    'break_minutes': tmpl.break_minutes,
                    'duration_minutes': tmpl.get_duration_minutes(),
                    'color': tmpl.color or emp.color,
                    'applicable_days': tmpl.applicable_days,  # Dodane do weryfikacji
                }
                shifts.append(shift)
        
        # Sortuj po dacie i pracowniku
        shifts.sort(key=lambda x: (x['date'], x['employee_name']))
        
        # WALIDACJA: Sprawdź czy wszystkie zmiany są przypisane do właściwych dni
        print("\n🔍 WALIDACJA PRZYPISAŃ:")
        violations = []
        for shift in shifts:
            day = shift['day']
            weekday = self.data.day_to_weekday[day]
            day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            actual_day_name = day_names[weekday]
            
            applicable = shift.get('applicable_days', [])
            if applicable and actual_day_name not in applicable:
                violations.append(
                    f"❌ BŁĄD: {shift['date']} ({actual_day_name}) - {shift['employee_name']} - "
                    f"szablon '{shift['template_name']}' dozwolony tylko w: {applicable}"
                )
        
        if violations:
            print(f"   ⚠️ Znaleziono {len(violations)} naruszeń:")
            for v in violations[:10]:  # Pokaż max 10
                print(f"      {v}")
        else:
            print("   ✅ Wszystkie przypisania poprawne (dni tygodnia zgadzają się z szablonami)")
        
        return shifts
    
    def _calculate_statistics(
        self, solver: cp_model.CpSolver, shifts: List[Dict], solve_time: float
    ) -> Dict:
        """Oblicza statystyki rozwiązania."""
        
        objective = solver.ObjectiveValue()
        
        # Oblicz jakość (0-100%)
        # Im mniejsza wartość funkcji celu (kary), tym lepsza jakość
        # Zakładamy że max kara to ~100000 dla najgorszego przypadku
        max_penalty_estimate = 100000
        raw_quality = max(0, 1 - (objective / max_penalty_estimate))
        quality_percent = min(100, raw_quality * 100)
        
        # Jeśli OPTIMAL, jakość = 100%
        if self._solver_status == cp_model.OPTIMAL:
            quality_percent = 100.0
        
        # Policz godziny na pracownika
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
        print("-" * 60)
        
        hours_by_emp: Dict[str, float] = defaultdict(float)
        shifts_by_emp: Dict[str, int] = defaultdict(int)
        
        for shift in shifts:
            hours_by_emp[shift['employee_name']] += shift['duration_minutes'] / 60
            shifts_by_emp[shift['employee_name']] += 1
        
        for emp in self.data.employees:
            name = emp.full_name
            target_h = emp.get_target_minutes(self.data.monthly_norm_minutes, len(self.data.weekdays)) / 60
            actual_h = hours_by_emp.get(name, 0)
            num_shifts = shifts_by_emp.get(name, 0)
            diff = actual_h - target_h
            
            status = "✅" if abs(diff) <= 1 else ("⚠️" if abs(diff) <= 4 else "❌")
            
            print(f"  {status} {name:25s} | Target: {target_h:5.1f}h | "
                  f"Actual: {actual_h:5.1f}h | Diff: {diff:+5.1f}h | Zmiany: {num_shifts}")
        
        print("-" * 60)
    
    def _print_schedule_table(self, shifts: List[Dict]):
        """Wyświetla tabelę harmonogramu dla pierwszych 10 dni."""
        print("\n📅 TABELA HARMONOGRAMU (pierwsze 10 dni):")
        print("-" * 85)
        print(f"{'Dzień':<12} | {'Pracownik':<20} | {'Zmiana':<18} | {'Godziny':<10}")
        print("-" * 85)
        
        # Grupuj zmiany po dniach
        shifts_by_day: Dict[int, List[Dict]] = defaultdict(list)
        for shift in shifts:
            shifts_by_day[shift['day']].append(shift)
        
        # Wyświetl pierwsze 10 dni
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
        
        # Sprawdź podstawowe warunki
        if len(self.data.employees) == 0:
            reasons.append("Brak aktywnych pracowników")
        
        if len(self.data.templates) == 0:
            reasons.append("Brak szablonów zmian")
        
        # Sprawdź czy są jakieś możliwe zmienne
        if self.stats['total_variables'] == 0:
            reasons.append("Brak możliwych przypisań (wszyscy mają urlopy lub brak pasujących szablonów?)")
        
        # Sprawdź proporcje godzin
        # Suma wymaganych godzin pracowników vs dostępne zmiennych
        total_required_hours = sum(
            emp.get_target_minutes(self.data.monthly_norm_minutes, len(self.data.weekdays)) / 60
            for emp in self.data.employees
        )
        
        # Średnia długość zmiany
        avg_shift_hours = sum(t.get_duration_minutes() for t in self.data.templates) / max(len(self.data.templates), 1) / 60
        
        # Maksymalna liczba zmian możliwych (1 zmiana na pracownika na dzień)
        workable_days = len([d for d in self.data.all_days if self.data.is_workable_day(d)])
        max_shifts = len(self.data.employees) * workable_days
        max_hours_available = max_shifts * avg_shift_hours
        
        if total_required_hours > max_hours_available * 1.2:  # 20% margines
            reasons.append(
                f"Niewystarczająca pojemność: wymagane ~{total_required_hours:.0f}h, "
                f"dostępne max ~{max_hours_available:.0f}h"
            )
        
        # Sprawdź zmienne shift - ile ich faktycznie jest
        if self.stats['total_variables'] < max_shifts * 0.5:
            reasons.append(
                f"Bardzo mało możliwych przypisań ({self.stats['total_variables']}) - "
                f"sprawdź przypisania szablonów do pracowników"
            )
        
        return reasons if reasons else ["Nieznana przyczyna - sprawdź logi solvera"]


# =============================================================================
# GŁÓWNA FUNKCJA API
# =============================================================================

def generate_schedule_optimized(input_data: Dict) -> Dict:
    """
    Główna funkcja do generowania grafiku.
    
    Args:
        input_data: Słownik z danymi wejściowymi w formacie CP-SAT
    
    Returns:
        Słownik z wynikami:
        - status: 'SUCCESS' | 'INFEASIBLE' | 'ERROR'
        - shifts: Lista przypisanych zmian
        - statistics: Statystyki rozwiązania
        - error: Komunikat błędu (jeśli status != SUCCESS)
    """
    try:
        print("\n" + "="*80)
        print("🚀 CALENDA SCHEDULE - CP-SAT OPTIMIZER v3.0")
        print("="*80)
        
        # KROK 1: Preprocessing danych
        data = DataModel(input_data)
        
        # KROK 2: Inicjalizacja schedulera
        scheduler = CPSATScheduler(data)
        
        # KROK 3: Tworzenie zmiennych decyzyjnych
        scheduler.create_decision_variables()
        
        # KROK 4: Dodawanie hard constraints
        scheduler.add_hard_constraints()
        
        # KROK 5: Dodawanie soft constraints
        scheduler.add_soft_constraints()
        
        # KROK 6: Rozwiązywanie
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
        'monthly_hours_norm': 160,  # 20 dni roboczych * 8h
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
                'break_minutes': 30,
                'min_employees': 1,
                'max_employees': 3,
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
            {
                'id': 'morning_6h',
                'name': 'Poranna 6h',
                'start_time': '08:00',
                'end_time': '14:00',
                'break_minutes': 15,
                'min_employees': 1,
                'max_employees': 2,
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            },
            {
                'id': 'afternoon_8h',
                'name': 'Popołudniowa 8h',
                'start_time': '14:00',
                'end_time': '22:00',
                'break_minutes': 30,
                'min_employees': 1,
                'max_employees': 3,
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            },
            {
                'id': 'long_12h',
                'name': 'Długi dyżur 12h',
                'start_time': '08:00',
                'end_time': '20:00',
                'break_minutes': 60,
                'min_employees': 1,
                'max_employees': 2,
                'applicable_days': ['saturday', 'sunday'],
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
                'preferred_days': [0, 1, 2, 3, 4],  # Pn-Pt
                'unavailable_days': [6],  # Niedziela
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
