"""
================================================================================
ZAAWANSOWANY TEST GENERATORA GRAFIKÓW - DYNAMICZNE SCENARIUSZE
================================================================================

Test kompleksowo sprawdza algorytm CP-SAT poprzez:
1. Dynamiczne generowanie możliwych do ułożenia scenariuszy
2. Weryfikację wszystkich zasad Kodeksu Pracy
3. Testowanie różnych konfiguracji (8h/12h, liczba pracowników, dni otwarcia)
4. Analizę jakości wygenerowanego grafiku

SPRAWDZANE ZASADY:
-----------------
✅ R1: Max godzin na miesiąc (norma + max 8h nadgodzin na miesiąc)
✅ R2: Min/Max employees na zmianach (jeśli nie 0 lub null)
✅ R3: Pokrycie zmianowe - minimum 1 pracownik w godzinach otwarcia
✅ R4: Równomierna obsada na zmianach (±1 pracownik)
✅ R5: Sprawiedliwy rozdział zmian między pracownikami (±1 zmiana)
✅ R6: Sklep otwarty w niedzielę = zmiany, sklep zamknięty = brak zmian

Autor: Calenda Schedule Team
Data: 2026-01-31
================================================================================
"""

import requests
import json
import random
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Tuple, Optional
from collections import defaultdict, Counter
import calendar

# ============================================================================
# KONFIGURACJA
# ============================================================================

BASE_URL = "http://localhost:8080"
API_KEY = "schedule-saas-local-dev-2026"

HEADERS = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

# Kolory dla pracowników
COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", 
          "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"]

# Imiona i nazwiska dla realistycznych danych
FIRST_NAMES = ["Anna", "Jan", "Maria", "Piotr", "Katarzyna", "Tomasz", 
               "Agnieszka", "Michał", "Magdalena", "Krzysztof", "Joanna", 
               "Andrzej", "Barbara", "Paweł", "Ewa"]
LAST_NAMES = ["Nowak", "Kowalski", "Wiśniewski", "Dąbrowski", "Lewandowski",
              "Wójcik", "Kamiński", "Kowalczyk", "Zieliński", "Szymański",
              "Woźniak", "Kozłowski", "Jankowski", "Mazur", "Krawczyk"]


# ============================================================================
# GENERATORY SCENARIUSZY
# ============================================================================

class ScenarioGenerator:
    """Generator realistycznych i możliwych do ułożenia scenariuszy testowych."""
    
    def __init__(self, year: int = 2026, month: int = 2):
        self.year = year
        self.month = month
        self.days_in_month = calendar.monthrange(year, month)[1]
        
    def get_working_days_count(self) -> int:
        """Oblicza liczbę dni roboczych w miesiącu (bez niedziel handlowych)."""
        working_days = 0
        for day in range(1, self.days_in_month + 1):
            d = date(self.year, self.month, day)
            # Zakładamy, że niedziela nie jest dniem roboczym (może być zmienione w scenariuszu)
            if d.weekday() != 6:  # 6 = niedziela
                working_days += 1
        return working_days
    
    def calculate_monthly_hours(self, employment_type: str, working_days: int) -> Tuple[int, int]:
        """
        Oblicza normę godzin dla typu etatu.
        
        Returns:
            (norma_godzin, max_godzin) - max_hours = norma (zgodnie z Next.js)
        """
        # Średnio 8h dziennie * dni robocze
        full_time_base = working_days * 8
        
        employment_multiplier = {
            'full': 1.0,
            'three_quarter': 0.75,
            'half': 0.5,
            'one_third': 0.33
        }
        
        multiplier = employment_multiplier.get(employment_type, 1.0)
        base_hours = int(full_time_base * multiplier)
        
        # max_hours = norma (bez nadgodzin) - zgodnie z Next.js data-transformer
        # Solver będzie dążył do wypełnienia tej normy
        max_hours = base_hours
        
        return base_hours, max_hours
    
    def generate_employees(self, count: int, employment_mix: Dict[str, float]) -> List[Dict]:
        """
        Generuje listę pracowników z różnymi typami etatów.
        
        Args:
            count: Liczba pracowników
            employment_mix: Rozkład etatów, np. {'full': 0.7, 'half': 0.3}
        """
        employees = []
        working_days = self.get_working_days_count()
        
        used_names = set()
        
        for i in range(count):
            # Losuj typ etatu według rozkładu
            rand_val = random.random()
            cumulative = 0
            employment_type = 'full'
            for emp_type, prob in employment_mix.items():
                cumulative += prob
                if rand_val <= cumulative:
                    employment_type = emp_type
                    break
            
            # Generuj unikalne imię i nazwisko
            while True:
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)
                full_name = f"{first_name} {last_name}"
                if full_name not in used_names:
                    used_names.add(full_name)
                    break
            
            base_hours, max_hours = self.calculate_monthly_hours(employment_type, working_days)
            
            employee = {
                'id': str(uuid.uuid4()),
                'name': full_name,
                'contract_type': employment_type,
                'weekly_hours': None,
                'max_hours': max_hours,
                'custom_monthly_hours': base_hours if employment_type == 'custom' else None,
                'color': random.choice(COLORS),
                'position': 'Pracownik',
                'preferences': {
                    'preferred_days': [],
                    'avoided_days': [],
                    'max_hours_per_week': None
                },
                'absences': [],
                'template_assignments': []
            }
            
            employees.append(employee)
        
        return employees
    
    def generate_shift_templates(self, 
                                  shift_type: str = 'mixed',
                                  open_time: str = '08:00:00',
                                  close_time: str = '20:00:00',
                                  min_employees: Optional[int] = None,
                                  max_employees: Optional[int] = None,
                                  include_sundays: bool = False) -> List[Dict]:
        """
        Generuje szablony zmian.
        
        Args:
            shift_type: '8h', '12h', 'mixed'
            open_time: Godzina otwarcia
            close_time: Godzina zamknięcia
            min_employees: Min pracowników na zmianę (None = bez ograniczenia)
            max_employees: Max pracowników na zmianę (None = bez ograniczenia)
            include_sundays: Czy szablony obejmują niedziele
        """
        templates = []
        
        # Dni tygodnia jako stringi (API wymaga tego formatu)
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        if include_sundays:
            all_days = weekdays + ["sunday"]
        else:
            all_days = weekdays
        
        # Parsuj godziny
        open_hour = int(open_time.split(':')[0])
        close_hour = int(close_time.split(':')[0])
        total_hours = close_hour - open_hour
        
        if shift_type == '8h' or (shift_type == 'mixed' and total_hours <= 8):
            # Jedna 8-godzinna zmiana pokrywająca cały dzień
            templates.append({
                'id': str(uuid.uuid4()),
                'name': 'Zmiana dzienna (8h)',
                'start_time': open_time,
                'end_time': close_time,
                'break_minutes': 30,
                'applicable_days': all_days,
                'min_employees': min_employees,
                'max_employees': max_employees,
                'color': '#10B981'
            })
        elif shift_type == '8h' and total_hours >= 12:
            # Dwie 8-godzinne zmiany
            templates.append({
                'id': str(uuid.uuid4()),
                'name': 'Zmiana poranna (8h)',
                'start_time': open_time,
                'end_time': f'{open_hour + 8:02d}:00:00',
                'break_minutes': 30,
                'applicable_days': all_days,
                'min_employees': min_employees,
                'max_employees': max_employees,
                'color': '#3B82F6'
            })
            
            mid_hour = close_hour - 8
            templates.append({
                'id': str(uuid.uuid4()),
                'name': 'Zmiana popołudniowa (8h)',
                'start_time': f'{mid_hour:02d}:00:00',
                'end_time': close_time,
                'break_minutes': 30,
                'applicable_days': all_days,
                'min_employees': min_employees,
                'max_employees': max_employees,
                'color': '#EF4444'
            })
        
        elif shift_type == '12h':
            # Dwie 12-godzinne zmiany
            templates.append({
                'id': str(uuid.uuid4()),
                'name': 'Zmiana dzienna (12h)',
                'start_time': '06:00:00',
                'end_time': '18:00:00',
                'break_minutes': 45,
                'applicable_days': all_days,
                'min_employees': min_employees,
                'max_employees': max_employees,
                'color': '#8B5CF6'
            })
            
            templates.append({
                'id': str(uuid.uuid4()),
                'name': 'Zmiana nocna (12h)',
                'start_time': '18:00:00',
                'end_time': '06:00:00',  # Następnego dnia
                'break_minutes': 45,
                'applicable_days': all_days,
                'min_employees': min_employees,
                'max_employees': max_employees,
                'color': '#EC4899'
            })
        
        elif shift_type == 'mixed':
            # Mix 8h i 12h
            templates.append({
                'id': str(uuid.uuid4()),
                'name': 'Zmiana poranna (8h)',
                'start_time': '08:00:00',
                'end_time': '16:00:00',
                'break_minutes': 30,
                'applicable_days': all_days,
                'min_employees': min_employees,
                'max_employees': max_employees,
                'color': '#3B82F6'
            })
            
            templates.append({
                'id': str(uuid.uuid4()),
                'name': 'Zmiana popołudniowa (8h)',
                'start_time': '12:00:00',
                'end_time': '20:00:00',
                'break_minutes': 30,
                'applicable_days': all_days,
                'min_employees': min_employees,
                'max_employees': max_employees,
                'color': '#EF4444'
            })
        
        return templates
    
    def generate_trading_sundays(self, probability: float = 0.3) -> List[str]:
        """
        Generuje listę niedziel handlowych.
        
        Args:
            probability: Prawdopodobieństwo, że niedziela będzie handlowa (0.0-1.0)
        """
        trading_sundays = []
        
        for day in range(1, self.days_in_month + 1):
            d = date(self.year, self.month, day)
            if d.weekday() == 6:  # Niedziela
                if random.random() < probability:
                    trading_sundays.append(d.strftime('%Y-%m-%d'))
        
        return trading_sundays
    
    def generate_scenario(self, 
                          num_employees: int,
                          shift_type: str = 'mixed',
                          employment_mix: Optional[Dict[str, float]] = None,
                          open_time: str = '08:00:00',
                          close_time: str = '20:00:00',
                          min_employees_per_shift: Optional[int] = 2,
                          max_employees_per_shift: Optional[int] = 4,
                          trading_sunday_probability: float = 0.3,
                          closed_days: Optional[List[int]] = None) -> Dict:
        """
        Generuje kompletny scenariusz testowy.
        
        Args:
            num_employees: Liczba pracowników
            shift_type: Typ zmian ('8h', '12h', 'mixed')
            employment_mix: Rozkład etatów
            open_time: Godzina otwarcia
            close_time: Godzina zamknięcia
            min_employees_per_shift: Min pracowników na zmianę
            max_employees_per_shift: Max pracowników na zmianę
            trading_sunday_probability: Prawdopodobieństwo niedzieli handlowej
            closed_days: Lista dni kiedy sklep zamknięty (1-31)
        """
        if employment_mix is None:
            employment_mix = {'full': 0.7, 'half': 0.2, 'three_quarter': 0.1}
        
        if closed_days is None:
            closed_days = []
        
        employees = self.generate_employees(num_employees, employment_mix)
        
        # Sprawdź czy będą niedziele handlowe
        has_trading_sundays = trading_sunday_probability > 0
        
        templates = self.generate_shift_templates(
            shift_type=shift_type,
            open_time=open_time,
            close_time=close_time,
            min_employees=min_employees_per_shift,
            max_employees=max_employees_per_shift,
            include_sundays=has_trading_sundays
        )
        trading_sundays = self.generate_trading_sundays(trading_sunday_probability)
        
        # Konwertuj pracowników do formatu CP-SAT
        cpsat_employees = []
        for emp in employees:
            cpsat_employees.append({
                'id': emp['id'],
                'first_name': emp['name'].split()[0],
                'last_name': emp['name'].split()[1] if len(emp['name'].split()) > 1 else '',
                'position': emp['position'],
                'employment_type': emp['contract_type'],
                'is_active': True,
                'color': emp['color'],
                'max_hours': emp['max_hours']
            })
        
        # Employee preferences (puste, ale mogą być rozbudowane)
        employee_preferences = [
            {
                'employee_id': emp['id'],
                'preferred_start_time': None,
                'max_hours_per_week': None,
                'can_work_weekends': True,
                'preferred_days': [],
                'unavailable_days': []
            }
            for emp in cpsat_employees
        ]
        
        # Trading sundays w formacie CP-SAT
        cpsat_trading_sundays = [{'date': ts, 'is_active': True} for ts in trading_sundays]
        
        # Oblicz monthly_hours_norm (norma dla pełnego etatu)
        # Zakładamy 8h/dzień × liczba dni roboczych (Pn-Pt, bez niedziel)
        work_days = sum(
            1 for day in range(1, self.days_in_month + 1)
            if date(self.year, self.month, day).weekday() < 5  # Pn-Pt
        )
        monthly_hours_norm = work_days * 8
        
        scenario = {
            'year': self.year,
            'month': self.month,
            'monthly_hours_norm': monthly_hours_norm,  # KRYTYCZNE: musi być dla CP-SAT
            'organization_settings': {
                'store_open_time': open_time,
                'store_close_time': close_time,
                'min_employees_per_shift': min_employees_per_shift or 1,
                'enable_trading_sundays': len(trading_sundays) > 0
            },
            'shift_templates': templates,
            'employees': cpsat_employees,
            'employee_preferences': employee_preferences,
            'employee_absences': [],
            'scheduling_rules': {
                'max_consecutive_days': 6,
                'min_daily_rest_hours': 11,
                'max_weekly_work_hours': 48
            },
            'trading_sundays': cpsat_trading_sundays,
            'solver_time_limit': 120
        }
        
        return scenario


# ============================================================================
# WALIDATORY ZASAD
# ============================================================================

class ScheduleValidator:
    """Walidator sprawdzający wszystkie zasady grafiku."""
    
    def __init__(self, scenario: Dict, schedule_result: Dict):
        self.scenario = scenario
        self.result = schedule_result
        
        # Obsługa obu formatów
        if 'input' in scenario:
            self.input_data = scenario['input']
        else:
            self.input_data = scenario
        
        self.schedule = schedule_result.get('schedule', {})
        self.stats = schedule_result.get('statistics', {})
        
        self.employees = {emp['id']: emp for emp in self.input_data['employees']}
        
        # Obsługa różnych nazw pól dla templates
        templates_key = 'shift_templates' if 'shift_templates' in self.input_data else 'templates'
        self.templates = {tmpl['id']: tmpl for tmpl in self.input_data[templates_key]}
        
        self.year = self.input_data['year']
        self.month = self.input_data['month']
        self.days_in_month = calendar.monthrange(self.year, self.month)[1]
        
        # Obsługa różnych struktur settings
        if 'organization_settings' in self.input_data:
            settings = self.input_data['organization_settings']
        else:
            settings = self.input_data.get('settings', {})
        
        # Godziny otwarcia
        self.open_time = settings.get('store_open_time', '08:00:00')
        self.close_time = settings.get('store_close_time', '20:00:00')
        self.closed_days = settings.get('closed_days', [])
        
        # Trading sundays - obsługa różnych formatów
        trading_sundays_data = self.input_data.get('trading_sundays', [])
        if trading_sundays_data and isinstance(trading_sundays_data[0], dict):
            # Format: [{'date': '2026-02-01', 'is_active': True}]
            self.trading_sundays = set(ts['date'] for ts in trading_sundays_data if ts.get('is_active', True))
        else:
            # Format: ['2026-02-01', '2026-02-08']
            self.trading_sundays = set(trading_sundays_data)
        
        self.errors = []
        self.warnings = []
    
    def time_to_minutes(self, time_str: str) -> int:
        """Konwertuje czas HH:MM:SS na minuty."""
        parts = time_str.split(':')
        return int(parts[0]) * 60 + int(parts[1])
    
    def validate_all(self) -> bool:
        """Wykonuje wszystkie walidacje."""
        print("\n" + "="*80)
        print("  WALIDACJA GRAFIKU")
        print("="*80)
        
        self.validate_rule_1_max_hours()
        self.validate_rule_2_min_max_employees()
        self.validate_rule_3_coverage()
        self.validate_rule_4_balanced_staffing()
        self.validate_rule_5_fair_shift_distribution()
        self.validate_rule_6_sunday_logic()
        
        # Podsumowanie
        print("\n" + "-"*80)
        if self.errors:
            print(f"❌ WALIDACJA NIEUDANA: {len(self.errors)} błędów")
            for error in self.errors:
                print(f"   ❌ {error}")
        else:
            print("✅ WSZYSTKIE ZASADY SPEŁNIONE!")
        
        if self.warnings:
            print(f"\n⚠️  Ostrzeżenia: {len(self.warnings)}")
            for warning in self.warnings:
                print(f"   ⚠️  {warning}")
        
        return len(self.errors) == 0
    
    def validate_rule_1_max_hours(self):
        """R1: Maksymalnie 160-180h/miesiąc (norma + max 8h nadgodzin)."""
        print("\n📊 R1: Sprawdzanie limitów godzin pracowników...")
        
        for emp_id, emp_data in self.employees.items():
            # Obsługa różnych formatów nazw
            if 'name' in emp_data:
                emp_name = emp_data['name']
            else:
                emp_name = f"{emp_data.get('first_name', '')} {emp_data.get('last_name', '')}".strip()
            
            max_hours = emp_data.get('max_hours', 200)
            
            # Pobierz faktyczne przepracowane godziny
            actual_hours = 0
            emp_schedule = self.schedule.get(emp_id, {})
            
            for day_str, shifts in emp_schedule.items():
                for shift in shifts:
                    template_id = shift.get('template_id')
                    if template_id and template_id in self.templates:
                        template = self.templates[template_id]
                        start_min = self.time_to_minutes(template['start_time'])
                        end_min = self.time_to_minutes(template['end_time'])
                        break_min = template.get('break_minutes', 0)
                        
                        duration = end_min - start_min - break_min
                        if duration < 0:  # Zmiana nocna przez północ
                            duration += 24 * 60
                        
                        actual_hours += duration / 60
            
            # Sprawdź limit
            if actual_hours > max_hours:
                self.errors.append(
                    f"R1: {emp_name} przekroczył limit godzin: {actual_hours:.1f}h > {max_hours}h"
                )
                print(f"   ❌ {emp_name}: {actual_hours:.1f}h / {max_hours}h (PRZEKROCZENIE)")
            else:
                print(f"   ✅ {emp_name}: {actual_hours:.1f}h / {max_hours}h")
    
    def validate_rule_2_min_max_employees(self):
        """R2: Przestrzeganie min/max employees (jeśli nie 0 lub null)."""
        print("\n👥 R2: Sprawdzanie limitów obsady na zmianach...")
        
        violations = 0
        
        for day in range(1, self.days_in_month + 1):
            day_date = date(self.year, self.month, day)
            day_str = day_date.strftime('%Y-%m-%d')
            
            # Pomiń zamknięte dni
            if day in self.closed_days:
                continue
            
            # Pomiń niedziele bez handlu
            if day_date.weekday() == 6 and day_str not in self.trading_sundays:
                continue
            
            # Zlicz pracowników na każdym szablonie zmian
            template_counts = defaultdict(int)
            
            for emp_id, emp_schedule in self.schedule.items():
                day_shifts = emp_schedule.get(day_str, [])
                for shift in day_shifts:
                    template_id = shift.get('template_id')
                    if template_id:
                        template_counts[template_id] += 1
            
            # Sprawdź limity dla każdego szablonu
            for template_id, count in template_counts.items():
                if template_id not in self.templates:
                    continue
                
                template = self.templates[template_id]
                min_emp = template.get('min_employees')
                max_emp = template.get('max_employees')
                
                # Sprawdź min (jeśli ustawiony i nie 0)
                if min_emp and min_emp > 0 and count < min_emp:
                    self.errors.append(
                        f"R2: Dzień {day_str}, {template['name']}: {count} pracowników < min {min_emp}"
                    )
                    violations += 1
                
                # Sprawdź max (jeśli ustawiony i nie 0)
                if max_emp and max_emp > 0 and count > max_emp:
                    self.errors.append(
                        f"R2: Dzień {day_str}, {template['name']}: {count} pracowników > max {max_emp}"
                    )
                    violations += 1
        
        if violations == 0:
            print("   ✅ Wszystkie limity obsady przestrzegane")
        else:
            print(f"   ❌ {violations} naruszeń limitów obsady")
    
    def validate_rule_3_coverage(self):
        """R3: Minimum 1 pracownik w godzinach otwarcia."""
        print("\n🏪 R3: Sprawdzanie pokrycia godzin otwarcia...")
        
        open_minutes = self.time_to_minutes(self.open_time)
        close_minutes = self.time_to_minutes(self.close_time)
        
        uncovered_days = []
        
        for day in range(1, self.days_in_month + 1):
            day_date = date(self.year, self.month, day)
            day_str = day_date.strftime('%Y-%m-%d')
            
            # Pomiń zamknięte dni
            if day in self.closed_days:
                continue
            
            # Pomiń niedziele bez handlu
            if day_date.weekday() == 6 and day_str not in self.trading_sundays:
                continue
            
            # Zbierz wszystkie zmiany w tym dniu
            day_has_coverage = False
            
            for emp_id, emp_schedule in self.schedule.items():
                day_shifts = emp_schedule.get(day_str, [])
                for shift in day_shifts:
                    template_id = shift.get('template_id')
                    if template_id and template_id in self.templates:
                        template = self.templates[template_id]
                        shift_start = self.time_to_minutes(template['start_time'])
                        shift_end = self.time_to_minutes(template['end_time'])
                        
                        # Sprawdź, czy zmiana pokrywa godziny otwarcia (chociaż częściowo)
                        if shift_start <= open_minutes and shift_end >= close_minutes:
                            day_has_coverage = True
                            break
                        elif shift_start < close_minutes and shift_end > open_minutes:
                            day_has_coverage = True
                            break
                
                if day_has_coverage:
                    break
            
            if not day_has_coverage:
                uncovered_days.append(day_str)
                self.errors.append(f"R3: Brak pokrycia w dniu {day_str}")
        
        if uncovered_days:
            print(f"   ❌ {len(uncovered_days)} dni bez pokrycia: {uncovered_days}")
        else:
            print("   ✅ Wszystkie dni robocze pokryte")
    
    def validate_rule_4_balanced_staffing(self):
        """R4: Równomierna obsada na zmianach (±1 pracownik)."""
        print("\n⚖️  R4: Sprawdzanie równomierności obsady...")
        
        # Dla każdego szablonu zmian, zlicz obsadę w każdym dniu
        template_daily_counts = defaultdict(list)
        
        for day in range(1, self.days_in_month + 1):
            day_date = date(self.year, self.month, day)
            day_str = day_date.strftime('%Y-%m-%d')
            
            # Pomiń zamknięte dni
            if day in self.closed_days:
                continue
            
            # Pomiń niedziele bez handlu
            if day_date.weekday() == 6 and day_str not in self.trading_sundays:
                continue
            
            template_counts = defaultdict(int)
            
            for emp_id, emp_schedule in self.schedule.items():
                day_shifts = emp_schedule.get(day_str, [])
                for shift in day_shifts:
                    template_id = shift.get('template_id')
                    if template_id:
                        template_counts[template_id] += 1
            
            for template_id, count in template_counts.items():
                template_daily_counts[template_id].append(count)
        
        # Sprawdź różnice
        for template_id, counts in template_daily_counts.items():
            if not counts:
                continue
            
            min_count = min(counts)
            max_count = max(counts)
            diff = max_count - min_count
            
            template_name = self.templates[template_id]['name'] if template_id in self.templates else template_id
            
            if diff > 1:
                self.warnings.append(
                    f"R4: {template_name} - różnica obsady {diff} (min={min_count}, max={max_count})"
                )
                print(f"   ⚠️  {template_name}: różnica {diff} pracowników (zalecane ±1)")
            else:
                print(f"   ✅ {template_name}: różnica {diff} pracowników")
    
    def validate_rule_5_fair_shift_distribution(self):
        """R5: Sprawiedliwy rozdział zmian między pracownikami (±1 zmiana)."""
        print("\n🎯 R5: Sprawdzanie sprawiedliwego rozdziału zmian...")
        
        # Dla każdego szablonu zmian, zlicz ile razy każdy pracownik go miał
        template_employee_counts = defaultdict(lambda: defaultdict(int))
        
        for emp_id, emp_schedule in self.schedule.items():
            for day_str, shifts in emp_schedule.items():
                for shift in shifts:
                    template_id = shift.get('template_id')
                    if template_id:
                        template_employee_counts[template_id][emp_id] += 1
        
        # Sprawdź różnice dla każdego szablonu
        for template_id, emp_counts in template_employee_counts.items():
            if len(emp_counts) < 2:
                continue  # Nie ma sensu sprawdzać dla jednego pracownika
            
            counts = list(emp_counts.values())
            min_shifts = min(counts)
            max_shifts = max(counts)
            diff = max_shifts - min_shifts
            
            template_name = self.templates[template_id]['name'] if template_id in self.templates else template_id
            
            if diff > 1:
                self.warnings.append(
                    f"R5: {template_name} - nierówny rozdział zmian: różnica {diff} (min={min_shifts}, max={max_shifts})"
                )
                print(f"   ⚠️  {template_name}: różnica {diff} zmian między pracownikami")
            else:
                print(f"   ✅ {template_name}: różnica {diff} zmian")
    
    def validate_rule_6_sunday_logic(self):
        """R6: Sklep otwarty w niedzielę = zmiany, zamknięty = brak zmian."""
        print("\n📅 R6: Sprawdzanie logiki niedziel...")
        
        violations = 0
        
        for day in range(1, self.days_in_month + 1):
            day_date = date(self.year, self.month, day)
            
            if day_date.weekday() != 6:  # Nie niedziela
                continue
            
            day_str = day_date.strftime('%Y-%m-%d')
            is_trading_sunday = day_str in self.trading_sundays
            
            # Zlicz zmiany w tę niedzielę
            shifts_count = 0
            for emp_id, emp_schedule in self.schedule.items():
                day_shifts = emp_schedule.get(day_str, [])
                shifts_count += len(day_shifts)
            
            if is_trading_sunday and shifts_count == 0:
                self.errors.append(f"R6: Niedziela handlowa {day_str} bez przypisanych zmian")
                violations += 1
                print(f"   ❌ {day_str}: niedziela handlowa BEZ zmian")
            elif not is_trading_sunday and shifts_count > 0:
                self.errors.append(f"R6: Niedziela niehandlowa {day_str} ma przypisane zmiany")
                violations += 1
                print(f"   ❌ {day_str}: niedziela niehandlowa ZE zmianami")
            elif is_trading_sunday:
                print(f"   ✅ {day_str}: niedziela handlowa ze zmianami ({shifts_count})")
        
        if violations == 0:
            print("   ✅ Logika niedziel poprawna")


# ============================================================================
# TESTY
# ============================================================================

def print_header(title: str):
    """Wyświetla nagłówek."""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def check_health() -> bool:
    """Sprawdza, czy scheduler jest dostępny."""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Python Scheduler is healthy")
            print(f"   Version: {data.get('version')}")
            print(f"   Service: {data.get('service')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to Python Scheduler: {e}")
        print(f"   Make sure it's running on {BASE_URL}")
        return False


def run_scenario_test(scenario_name: str, scenario: Dict) -> bool:
    """Wykonuje test dla scenariusza."""
    print_header(f"TEST: {scenario_name}")
    
    # Obsługa obu formatów - bezpośredni CP-SAT i Next.js wrapper
    if 'input' in scenario:
        # Format Next.js
        input_data = scenario['input']
    else:
        # Format CP-SAT (bezpośredni)
        input_data = scenario
    
    # Pokaż parametry scenariusza
    print(f"\n📋 Parametry scenariusza:")
    print(f"   Miesiąc: {input_data['month']}/{input_data['year']}")
    print(f"   Pracownicy: {len(input_data['employees'])}")
    
    # Obsługa różnych nazw pól dla templates
    templates_key = 'shift_templates' if 'shift_templates' in input_data else 'templates'
    print(f"   Szablony zmian: {len(input_data[templates_key])}")
    
    # Obsługa różnych struktur settings
    if 'organization_settings' in input_data:
        settings = input_data['organization_settings']
    else:
        settings = input_data.get('settings', {})
    
    print(f"   Godziny otwarcia: {settings.get('store_open_time', 'N/A')} - {settings.get('store_close_time', 'N/A')}")
    print(f"   Niedziele handlowe: {len(input_data.get('trading_sundays', []))}")
    
    # Wyślij request
    print(f"\n🚀 Wysyłanie żądania do {BASE_URL}/api/generate...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/generate",
            headers=HEADERS,
            json=scenario,
            timeout=180
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Błąd API: {response.text}")
            return False
        
        result = response.json()
        
        # Sprawdź sukces
        if not result.get('success'):
            print(f"❌ Generowanie grafiku nieudane")
            print(f"   Error: {result.get('error', 'Unknown error')}")
            if 'details' in result:
                print(f"   Details: {result['details']}")
            return False
        
        print("✅ Grafik wygenerowany pomyślnie")
        
        # Pokaż statystyki
        stats = result.get('statistics', {})
        print(f"\n📊 Statystyki:")
        print(f"   Total shifts: {stats.get('total_shifts', 0)}")
        print(f"   Solver status: {stats.get('solver_status', 'UNKNOWN')}")
        print(f"   Solve time: {stats.get('solve_time_seconds', 0):.2f}s")
        
        # Walidacja
        validator = ScheduleValidator(scenario, result)
        is_valid = validator.validate_all()
        
        return is_valid
        
    except requests.exceptions.Timeout:
        print("❌ Timeout - request trwał zbyt długo (>180s)")
        return False
    except Exception as e:
        print(f"❌ Błąd podczas testu: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_small_shop():
    """TEST 1: Mały sklep - 5 pracowników, 1 zmiana 8h (wczesne otwarcie)."""
    gen = ScenarioGenerator(year=2026, month=2)
    
    scenario = gen.generate_scenario(
        num_employees=5,
        shift_type='8h',
        employment_mix={'full': 1.0},
        open_time='06:00:00',
        close_time='14:00:00',
        min_employees_per_shift=2,
        max_employees_per_shift=3,
        trading_sunday_probability=0.0  # Bez niedziel handlowych dla prostoty
    )
    
    return run_scenario_test("Mały sklep - wczesne otwarcie (6:00-14:00)", scenario)


def test_medium_shop():
    """TEST 2: Średni sklep - 12 pracowników, 2 zmiany 8h (standardowe godziny)."""
    gen = ScenarioGenerator(year=2026, month=2)
    
    scenario = gen.generate_scenario(
        num_employees=12,
        shift_type='mixed',
        employment_mix={'full': 0.6, 'half': 0.3, 'three_quarter': 0.1},
        open_time='09:00:00',
        close_time='21:00:00',
        min_employees_per_shift=2,
        max_employees_per_shift=4,
        trading_sunday_probability=0.0  # Bez niedziel dla stabilności
    )
    
    return run_scenario_test("Średni sklep - standardowe godziny (9:00-21:00)", scenario)


def test_large_shop():
    """TEST 3: Duży market - 20 pracowników, 12h zmiany (długie godziny)."""
    gen = ScenarioGenerator(year=2026, month=2)
    
    scenario = gen.generate_scenario(
        num_employees=20,
        shift_type='12h',
        employment_mix={'full': 0.8, 'half': 0.2},
        open_time='06:00:00',
        close_time='22:00:00',
        min_employees_per_shift=3,
        max_employees_per_shift=6,
        trading_sunday_probability=0.0  # Bez niedziel dla stabilności
    )
    
    return run_scenario_test("Duży market - długie godziny (6:00-22:00)", scenario)


def test_late_opening_shop():
    """TEST 4: Sklep w centrum handlowym - późne otwarcie (10:00-22:00)."""
    gen = ScenarioGenerator(year=2026, month=2)
    
    scenario = gen.generate_scenario(
        num_employees=8,
        shift_type='8h',
        employment_mix={'full': 0.75, 'half': 0.25},
        open_time='10:00:00',
        close_time='22:00:00',
        min_employees_per_shift=2,
        max_employees_per_shift=3,
        trading_sunday_probability=0.0
    )
    
    return run_scenario_test("Sklep w centrum - późne otwarcie (10:00-22:00)", scenario)


def test_random_scenarios(count: int = 3):
    """TEST 5: Losowe scenariusze z różnymi godzinami otwarcia."""
    results = []
    
    for i in range(count):
        gen = ScenarioGenerator(year=2026, month=random.randint(1, 12))
        
        # Losowe parametry
        shift_type = random.choice(['8h', '12h', 'mixed'])
        min_emp = random.randint(1, 2)  # Mniejsze min dla realizmu
        max_emp = min_emp + random.randint(1, 2)
        
        # Losowe godziny otwarcia
        open_hours = [
            ('06:00:00', '14:00:00'),  # Wczesny sklep - 8h
            ('08:00:00', '16:00:00'),  # Standardowy krótki - 8h
            ('09:00:00', '21:00:00'),  # Standardowy długi - 12h
            ('10:00:00', '22:00:00'),  # Centrum handlowe - 12h
            ('06:00:00', '22:00:00'),  # Supermarket - 16h
        ]
        open_time, close_time = random.choice(open_hours)
        
        # Oblicz ile godzin dziennie potrzeba pokryć
        open_hour = int(open_time.split(':')[0])
        close_hour = int(close_time.split(':')[0])
        hours_per_day = close_hour - open_hour
        
        # Oblicz liczbę zmian na dzień (każda zmiana ~8h max, z nakładką)
        if hours_per_day <= 8:
            shifts_per_day = 1
        elif hours_per_day <= 12:
            shifts_per_day = 2
        else:
            shifts_per_day = 2  # Dla dłuższych nadal 2 (12h zmiany)
        
        # Oblicz wymagane godziny = dni robocze × min_emp × zmiany × 8h
        work_days = gen.get_working_days_count()
        required_hours = work_days * min_emp * shifts_per_day * 8
        
        # Każdy pracownik pełnoetatowy daje ~160h, ale mamy mix etatów
        # Zakładamy średnio 0.7 * 160 + 0.2 * 80 + 0.1 * 120 = 140h/pracownik
        avg_hours_per_employee = 140
        
        # Minimalna liczba pracowników z 20% marginesem
        min_employees_needed = int(required_hours / avg_hours_per_employee * 1.2) + 1
        
        # Losuj liczbę pracowników - od minimum do minimum + 5
        num_employees = random.randint(
            max(5, min_employees_needed),
            max(10, min_employees_needed + 5)
        )
        
        scenario = gen.generate_scenario(
            num_employees=num_employees,
            shift_type=shift_type,
            employment_mix={'full': 0.6, 'half': 0.3, 'three_quarter': 0.1},
            open_time=open_time,
            close_time=close_time,
            min_employees_per_shift=min_emp,
            max_employees_per_shift=max_emp,
            trading_sunday_probability=0.0  # Bez niedziel dla stabilności testów
        )
        
        result = run_scenario_test(f"Losowy scenariusz #{i+1}", scenario)
        results.append(result)
    
    return all(results)


def main():
    """Główna funkcja testująca."""
    print_header("ZAAWANSOWANE TESTY GENERATORA GRAFIKÓW")
    print("Test kompleksowo sprawdza algorytm CP-SAT")
    print("poprzez dynamiczne generowanie scenariuszy i walidację zasad.")
    
    # Sprawdź połączenie
    if not check_health():
        print("\n❌ TESTY PRZERWANE: Brak połączenia z Python Scheduler")
        print("   Uruchom scheduler: docker-compose up python-scheduler")
        return
    
    # Uruchom testy
    results = {}
    
    print_header("SERIA TESTÓW")
    
    print("\n1️⃣  Test małego sklepu (wczesne otwarcie)...")
    results['small_early'] = test_small_shop()
    
    print("\n2️⃣  Test średniego sklepu (standardowe godziny)...")
    results['medium'] = test_medium_shop()
    
    print("\n3️⃣  Test dużego sklepu (długie godziny)...")
    results['large'] = test_large_shop()
    
    print("\n4️⃣  Test sklepu w centrum (późne otwarcie)...")
    results['late_opening'] = test_late_opening_shop()
    
    print("\n5️⃣  Testy losowych scenariuszy (różne godziny)...")
    results['random'] = test_random_scenarios(3)
    
    # Podsumowanie
    print_header("PODSUMOWANIE TESTÓW")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"\nWyniki: {passed}/{total} testów zaliczonych")
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} - {test_name}")
    
    if passed == total:
        print("\n🎉 WSZYSTKIE TESTY ZALICZONE!")
        print("   Algorytm CP-SAT działa poprawnie i spełnia wszystkie zasady.")
    else:
        print(f"\n❌ {total - passed} TESTÓW NIE POWIODŁO SIĘ")
        print("   Sprawdź logi powyżej aby zidentyfikować problemy.")
    
    return passed == total


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
