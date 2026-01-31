"""
Calenda Schedule - Advanced CP-SAT Optimizer
Silnik optymalizacyjny do generowania grafików pracy z wykorzystaniem Google OR-Tools CP-SAT solver.
Autor: System ekspertowy OR-Tools
Data: 2026-01-30
"""

from ortools.sat.python import cp_model
from typing import Dict, List, Tuple, Optional, Set
from datetime import datetime, date, time, timedelta
from collections import defaultdict
import json
import traceback
from config import (
    SolverConfig,
    SoftConstraintWeights,
    HardConstraintDefaults,
    QualityMetrics,
    DiagnosticThresholds,
    TimeNorms,
    WeekdayMapping,
    ManagerKeywords
)


class ScheduleOptimizer:
    """
    Główna klasa optymalizatora grafików pracy.
    Wykorzystuje CP-SAT solver do generowania optymalnych przypisań pracowników do zmian.
    """
    
    def __init__(self, input_data: Dict):
        """
        Inicjalizacja optymalizatora z danymi wejściowymi.
        
        Args:
            input_data: Słownik zawierający wszystkie dane z bazy (employees, shift_templates, etc.)
        """
        self.data = input_data
        self.model = cp_model.CpModel()
        self.shifts_vars = {}  # (employee_id, day, shift_template_id) -> BoolVar
        self.solver = cp_model.CpSolver()
        
       # Ekstrakcja danych wejściowych
        self.organization_settings = input_data.get('organization_settings', {})
        self.shift_templates = input_data.get('shift_templates', [])
        self.employees = input_data.get('employees', [])
        self.employee_preferences = input_data.get('employee_preferences', {})
        self.employee_absences = input_data.get('employee_absences', [])
        self.scheduling_rules = input_data.get('scheduling_rules', {})
        self.trading_sundays = input_data.get('trading_sundays', [])
        self.year = input_data.get('year')
        self.month = input_data.get('month')
        
        # Obliczenie liczby dni w miesiącu
        self.days_in_month = self._get_days_in_month(self.year, self.month)
        self.all_days = list(range(1, self.days_in_month + 1))
        
        # Preprocessing danych
        self._preprocess_data()
        
        # Statystyki dla debugowania
        self.stats = {
            'total_variables': 0,
            'hard_constraints': 0,
            'soft_constraints': 0,
            'infeasibility_reasons': []
        }
    
    def _get_days_in_month(self, year: int, month: int) -> int:
        """Zwraca liczbę dni w danym miesiącu."""
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)
        last_day = next_month - timedelta(days=1)
        return last_day.day
    
    def _preprocess_data(self):
        """Preprocessing danych wejściowych - indeksowanie i konwersja typów."""
        
        # Indeksowanie pracowników
        self.employee_by_id = {emp['id']: emp for emp in self.employees if emp.get('is_active', True)}
        
        # Indeksowanie szablonów zmian
        self.template_by_id = {tpl['id']: tpl for tpl in self.shift_templates}
        
        # Indeksowanie preferencji pracowników
        self.prefs_by_employee = {}
        for pref in self.employee_preferences:
            emp_id = pref.get('employee_id')
            if emp_id:
                self.prefs_by_employee[emp_id] = pref
        
        # Indeksowanie przypisań szablonów do pracowników
        self.template_assignments_by_employee = {}
        for emp in self.employees:
            emp_id = emp.get('id')
            template_assignments = emp.get('template_assignments', [])
            if template_assignments:
                self.template_assignments_by_employee[emp_id] = set(template_assignments)
                print(f"  📌 Pracownik {emp.get('first_name', '')} {emp.get('last_name', '')} ma przypisane szablony: {len(template_assignments)}")
        
        # Preprocessing nieobecności - konwersja na zbiór (employee_id, day)
        self.absence_set: Set[Tuple[str, int]] = set()
        for absence in self.employee_absences:
            emp_id = absence['employee_id']
            start_date = self._parse_date(absence['start_date'])
            end_date = self._parse_date(absence['end_date'])
            
            # Dodaj wszystkie dni w zakresie
            current = start_date
            while current <= end_date:
                if current.year == self.year and current.month == self.month:
                    self.absence_set.add((emp_id, current.day))
                current += timedelta(days=1)
        
        # Preprocessing niedziel handlowych
        self.trading_sunday_days = set()
        for ts in self.trading_sundays:
            if ts.get('is_active', True):
                ts_date = self._parse_date(ts['date'])
                if ts_date.year == self.year and ts_date.month == self.month:
                    self.trading_sunday_days.add(ts_date.day)
        
        # Identyfikacja niedziel w miesiącu
        self.sundays_in_month = []
        for day in self.all_days:
            current_date = date(self.year, self.month, day)
            if current_date.weekday() == 6:  # Niedziela
                self.sundays_in_month.append(day)
        
        # Identyfikacja managerów (dla mix kompetencji)
        self.manager_ids = set()
        for emp_id, emp in self.employee_by_id.items():
            position = emp.get('position', '').lower()
            if 'manager' in position or 'kierownik' in position or 'menedżer' in position:
                self.manager_ids.add(emp_id)
        
        # Parsowanie godzin rozpoczęcia/zakończenia zmian
        for template in self.shift_templates:
            template['start_time_minutes'] = self._time_to_minutes(template['start_time'])
            template['end_time_minutes'] = self._time_to_minutes(template['end_time'])
            template['duration_minutes'] = self._calculate_shift_duration(
                template['start_time_minutes'],
                template['end_time_minutes']
            )
    
    def _parse_date(self, date_str) -> date:
        """Konwertuje string daty na obiekt date."""
        if isinstance(date_str, date):
            return date_str
        if isinstance(date_str, str):
            return datetime.strptime(date_str.split('T')[0], '%Y-%m-%d').date()
        return date_str
    
    def _time_to_minutes(self, time_str) -> int:
        """Konwertuje time/string na minuty od północy."""
        if isinstance(time_str, time):
            return time_str.hour * 60 + time_str.minute
        if isinstance(time_str, str):
            parts = time_str.split(':')
            return int(parts[0]) * 60 + int(parts[1])
        return 0
    
    def _calculate_shift_duration(self, start_minutes: int, end_minutes: int) -> int:
        """Oblicza czas trwania zmiany w minutach (obsługuje zmianę przez północ)."""
        if end_minutes >= start_minutes:
            return end_minutes - start_minutes
        else:
            # Zmiana przez północ (np. 22:00 - 06:00)
            return (24 * 60 - start_minutes) + end_minutes
    
    def _calculate_quality_percent(self, objective_value: float, total_shifts: int) -> float:
        """
        Normalizuje wartość funkcji celu CP-SAT do procentu jakości 0-100%.
        
        Logika:
        - objective_value > 0 = więcej nagród niż kar (dobra jakość)
        - objective_value = 0 = neutralny (średnia jakość)
        - objective_value < 0 = więcej kar niż nagród (słaba jakość)
        
        Normalizacja:
        - Szacujemy maksymalną możliwą wartość na podstawie liczby zmian
        - Każda zmiana może dawać max ~500 punktów nagrody (SC1-SC4)
        - Mapujemy zakres [-max, +max] na [0%, 100%]
        """
        if total_shifts == 0:
            return 0.0
        
        # Szacowany max bonus na zmianę (wszystkie soft constraints spełnione)
        # SC1: ~0 (brak kar), SC2: ~50, SC3: ~200, SC4: ~0 (brak kar)
        estimated_max_per_shift = 300
        estimated_max = total_shifts * estimated_max_per_shift
        
        # Szacowane minimum (wszystkie kary)
        estimated_min = -total_shifts * 500
        
        # Normalizacja do 0-100%
        if estimated_max == estimated_min:
            return 50.0
        
        # Mapuj objective_value na zakres 0-100%
        # objective_value = estimated_min -> 0%
        # objective_value = estimated_max -> 100%
        normalized = ((objective_value - estimated_min) / (estimated_max - estimated_min)) * 100
        
        # Ogranicz do zakresu 0-100%
        quality = max(0.0, min(100.0, normalized))
        
        print(f"  • Jakość grafiku: {quality:.1f}% (objective_value: {objective_value})")
        
        return quality
    
    def create_decision_variables(self):
        """
        Krok 1: Tworzenie zmiennych decyzyjnych.
        shifts[(employee_id, day, shift_template_id)] = BoolVar
        """
        print("🔧 Tworzenie zmiennych decyzyjnych...")
        
        # Sprawdź czy niedziele handlowe są włączone
        enable_trading_sundays = self.organization_settings.get('enable_trading_sundays', False)
        
        for emp_id in self.employee_by_id.keys():
            # Sprawdź czy pracownik ma przypisane konkretne szablony
            assigned_templates = self.template_assignments_by_employee.get(emp_id)
            
            for day in self.all_days:
                # Sprawdź nieobecność
                if (emp_id, day) in self.absence_set:
                    continue
                
                # Sprawdź czy to niedziela niehandlowa - wtedy pomijamy
                if day in self.sundays_in_month:
                    if not enable_trading_sundays:
                        # Wszystkie niedziele są zabronione
                        continue
                    elif day not in self.trading_sunday_days:
                        # Ta konkretna niedziela nie jest handlowa
                        continue
                
                for template in self.shift_templates:
                    template_id = template['id']
                    
                    # KLUCZOWE: Jeśli pracownik ma przypisane szablony, sprawdź czy ten szablon jest na liście
                    if assigned_templates is not None and template_id not in assigned_templates:
                        continue  # Pomiń szablony nie przypisane do tego pracownika
                    
                    # Sprawdź czy zmiana jest dozwolona w ten dzień tygodnia
                    if not self._is_template_applicable_on_day(template, day):
                        continue
                    
                    var_name = f'shift_e{emp_id[:8]}_d{day}_t{template_id[:8]}'
                    var = self.model.NewBoolVar(var_name)
                    self.shifts_vars[(emp_id, day, template_id)] = var
                    self.stats['total_variables'] += 1
        
        print(f"✅ Utworzono {self.stats['total_variables']} zmiennych decyzyjnych")
        
        # Pokaż statystyki przypisań szablonów
        if self.template_assignments_by_employee:
            print(f"\n📌 Pracownicy z przypisanymi szablonami: {len(self.template_assignments_by_employee)}")
            for emp_id, templates in self.template_assignments_by_employee.items():
                emp = self.employee_by_id.get(emp_id)
                if emp:
                    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
                    template_names = [self.template_by_id[tid]['name'] for tid in templates if tid in self.template_by_id]
                    print(f"  • {emp_name}: {', '.join(template_names)}")
        
        # Pokaż info o niedzielach
        if self.sundays_in_month:
            if enable_trading_sundays:
                if self.trading_sunday_days:
                    print(f"   📅 Niedziele handlowe: {sorted(self.trading_sunday_days)}")
                else:
                    print(f"   📅 Brak niedziel handlowych w tym miesiącu")
            else:
                print(f"   📅 Niedziele wyłączone (enable_trading_sundays=False)")
    
    def _is_template_applicable_on_day(self, template: Dict, day: int) -> bool:
        """Sprawdza czy szablon zmiany może być użyty w danym dniu tygodnia."""
        applicable_days = template.get('applicable_days')
        if not applicable_days:
            return True  # Brak ograniczeń
        
        current_date = date(self.year, self.month, day)
        weekday = current_date.weekday()
        
        day_mapping = {
            0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday',
            4: 'friday', 5: 'saturday', 6: 'sunday'
        }
        
        current_day_name = day_mapping[weekday]
        return current_day_name in applicable_days
    
    def add_hard_constraints(self):
        """
        Krok 2: Dodawanie ograniczeń twardych (MUSZĄ być spełnione).
        Priorytet: krytyczne ograniczenia prawne pierwsze, potem operacyjne.
        """
        print("\n🔒 Dodawanie ograniczeń twardych...")
        
        # HC1: Brak nakładania zmian - jeden pracownik maksymalnie jedna zmiana dziennie
        self._add_no_overlapping_shifts_constraint()
        
        # HC2: Maksimum 48h/tydzień (Art. 131 § 1 KP) - KRYTYCZNE PRAWO PRACY
        self._add_weekly_hours_constraint()
        
        # HC3: Odpoczynek dobowy - minimum 11h między zmianami (Art. 132 KP)
        self._add_daily_rest_constraint()
        
        # HC4: Maksymalna ciągłość pracy - max dni pod rząd (Art. 133 KP)
        self._add_max_consecutive_days_constraint()
        
        # HC5: Niedziele handlowe
        self._add_trading_sundays_constraint()
        
        # HC6: Zgodność z urlopami - już obsłużone w create_decision_variables
        print("  ✓ HC6: Zgodność z urlopami (obsłużone w zmiennych)")
        
        # HC7: Obsada zmian - każda zmiana musi mieć odpowiednią liczbę pracowników
        self._add_shift_staffing_constraint()
        
        # HC9: Pokrycie wszystkich dni roboczych - KRYTYCZNE dla działania grafiku
        self._add_daily_coverage_constraint()
        
        # HC10: Max godzin miesięcznie per pracownik - KRYTYCZNE dla zgodności z etatem
        self._add_max_monthly_hours_constraint()
        
        print(f"✅ Dodano {self.stats['hard_constraints']} ograniczeń twardych")
    
    def _add_no_overlapping_shifts_constraint(self):
        """HC1: Jeden pracownik może mieć max 1 zmianę dziennie."""
        count = 0
        for emp_id in self.employee_by_id.keys():
            for day in self.all_days:
                # Znajdź wszystkie zmienne dla tego pracownika w tym dniu
                day_shifts = [
                    var for (e_id, d, t_id), var in self.shifts_vars.items()
                    if e_id == emp_id and d == day
                ]
                
                if day_shifts:
                    # Suma zmian dla pracownika w dniu <= 1
                    self.model.Add(sum(day_shifts) <= 1)
                    count += 1
        
        self.stats['hard_constraints'] += count
        print(f"  ✓ HC1: Brak nakładania zmian ({count} ograniczeń)")
    
    def _add_shift_staffing_constraint(self):
        """HC7: Każda zmiana musi mieć odpowiednią liczbę pracowników.
        
        KRYTYCZNE: min_employees i max_employees MUSZĄ być przestrzegane!
        
        Logika min_employees:
        1. Jeśli szablon ma min_employees > 0, użyj wartości z szablonu
        2. Jeśli szablon ma min_employees = 0/null, użyj organization_settings.min_employees_per_shift
        3. Domyślnie minimum 1 pracownik
        
        Logika max_employees:
        1. Jeśli szablon ma max_employees > 0, wymuszaj jako twardy limit
        2. Jeśli brak - brak limitu górnego
        """
        count = 0
        coverage_issues = []
        
        # Pobierz domyślne min z organization_settings
        org_min = self.organization_settings.get('min_employees_per_shift', 1)
        
        for day in self.all_days:
            day_date = date(self.year, self.month, day)
            day_str = day_date.strftime('%Y-%m-%d')
            
            for template in self.shift_templates:
                template_id = template['id']
                
                # Sprawdź czy szablon jest stosowany w tym dniu
                if not self._is_template_applicable_on_day(template, day):
                    continue
                
                # Pobierz limity z szablonu
                template_min = template.get('min_employees')
                template_max = template.get('max_employees')
                
                # Użyj wartości z szablonu jeśli > 0, inaczej z organization_settings
                if template_min is not None and template_min > 0:
                    min_employees = template_min
                else:
                    min_employees = max(org_min, 1)  # Minimum 1 zawsze
                
                max_employees = template_max if template_max and template_max > 0 else None
                
                # Znajdź wszystkie zmienne dla tej zmiany w tym dniu
                shift_assignments = [
                    var for (e_id, d, t_id), var in self.shifts_vars.items()
                    if d == day and t_id == template_id
                ]
                
                available_count = len(shift_assignments)
                
                # Jeśli brak zmiennych ale wymagane min > 0 - problem!
                if available_count == 0:
                    if min_employees > 0:
                        coverage_issues.append(
                            f"Dzień {day_str}: Brak dostępnych pracowników dla zmiany {template.get('name', template_id)[:20]}, wymagane min {min_employees}"
                        )
                    continue
                
                # Jeśli dostępnych mniej niż min - zgłoś ostrzeżenie
                if available_count < min_employees:
                    coverage_issues.append(
                        f"Dzień {day_str}: Dostępnych {available_count} < min {min_employees} dla {template.get('name', template_id)[:20]}"
                    )
                
                # HARD CONSTRAINT: Minimum pracowników (MUSI być spełnione)
                if min_employees > 0:
                    self.model.Add(sum(shift_assignments) >= min_employees)
                    count += 1
                
                # HARD CONSTRAINT: Maximum pracowników (MUSI być spełnione jeśli ustawione)
                if max_employees is not None and max_employees > 0:
                    self.model.Add(sum(shift_assignments) <= max_employees)
                    count += 1
        
        self.stats['hard_constraints'] += count
        
        if coverage_issues:
            print(f"  ⚠️  HC7: Wykryto {len(coverage_issues)} potencjalnych problemów z obsadą:")
            for issue in coverage_issues[:5]:  # Max 5 pierwszych
                print(f"      • {issue}")
            if len(coverage_issues) > 5:
                print(f"      • ... i {len(coverage_issues) - 5} więcej")
        
        print(f"  ✓ HC7: Obsada zmian ({count} ograniczeń min/max employees)")
    
    def _add_daily_rest_constraint(self):
        """HC3: Minimum 11h odpoczynku między zmianami (Art. 132 KP)."""
        count = 0
        min_rest_hours = self.scheduling_rules.get('min_daily_rest_hours', 11)
        min_rest_minutes = int(min_rest_hours * 60)
        
        for emp_id in self.employee_by_id.keys():
            for day in range(1, self.days_in_month):  # Nie ostatni dzień
                next_day = day + 1
                
                # Dla każdej pary (zmiana_dzień_d, zmiana_dzień_d+1)
                for (e1, d1, t1), var1 in self.shifts_vars.items():
                    if e1 != emp_id or d1 != day:
                        continue
                    
                    template1 = self.template_by_id[t1]
                    shift1_end = template1['end_time_minutes']
                    
                    for (e2, d2, t2), var2 in self.shifts_vars.items():
                        if e2 != emp_id or d2 != next_day:
                            continue
                        
                        template2 = self.template_by_id[t2]
                        shift2_start = template2['start_time_minutes']
                        
                        # Oblicz czas odpoczynku
                        rest_minutes = self._calculate_rest_time(shift1_end, shift2_start)
                        
                        if rest_minutes < min_rest_minutes:
                            # Nie mogą być obie zmiany przypisane jednocześnie
                            self.model.Add(var1 + var2 <= 1)
                            count += 1
        
        self.stats['hard_constraints'] += count
        print(f"  ✓ HC3: Odpoczynek dobowy 11h ({count} ograniczeń)")
    
    def _calculate_rest_time(self, shift1_end_minutes: int, shift2_start_minutes: int) -> int:
        """Oblicza czas odpoczynku między zmianami w minutach."""
        if shift2_start_minutes >= shift1_end_minutes:
            return shift2_start_minutes - shift1_end_minutes
        else:
            # Przez północ
            return (24 * 60 - shift1_end_minutes) + shift2_start_minutes
    
    def _add_trading_sundays_constraint(self):
        """HC5: Zakaz pracy w niedziele niehandlowe."""
        count = 0
        enable_trading_sundays = self.organization_settings.get('enable_trading_sundays', False)
        
        if not enable_trading_sundays:
            # Jeśli niedziele handlowe są wyłączone, zabroń wszystkich niedziel
            for day in self.sundays_in_month:
                sunday_shifts = [
                    var for (e_id, d, t_id), var in self.shifts_vars.items()
                    if d == day
                ]
                
                for var in sunday_shifts:
                    self.model.Add(var == 0)
                    count += 1
        else:
            # Zabroń tylko niedziel, które NIE są w trading_sundays
            for day in self.sundays_in_month:
                if day not in self.trading_sunday_days:
                    sunday_shifts = [
                        var for (e_id, d, t_id), var in self.shifts_vars.items()
                        if d == day
                    ]
                    
                    for var in sunday_shifts:
                        self.model.Add(var == 0)
                        count += 1
        
        self.stats['hard_constraints'] += count
        print(f"  ✓ HC5: Niedziele handlowe ({count} ograniczeń)")
    
    def _add_max_consecutive_days_constraint(self):
        """HC4: Maksymalna liczba dni pracy pod rząd (Art. 133 KP)."""
        count = 0
        max_consecutive = self.scheduling_rules.get('max_consecutive_days', 6)
        
        for emp_id in self.employee_by_id.keys():
            # Sprawdź każde możliwe okno (max_consecutive + 1) dni
            for start_day in range(1, self.days_in_month - max_consecutive + 1):
                window_days = range(start_day, start_day + max_consecutive + 1)
                
                # Zbierz wszystkie zmiany dla pracownika w tym oknie
                window_shifts = [
                    var for (e_id, d, t_id), var in self.shifts_vars.items()
                    if e_id == emp_id and d in window_days
                ]
                
                if window_shifts:
                    # W oknie (max_consecutive + 1) dni może pracować max max_consecutive dni
                    self.model.Add(sum(window_shifts) <= max_consecutive)
                    count += 1
        
        self.stats['hard_constraints'] += count
        print(f"  ✓ HC4: Max {max_consecutive} dni z rzędu ({count} ograniczeń)")
    
    def _add_weekly_hours_constraint(self):
        """HC2: Maksimum 48 godzin pracy w tygodniu (Art. 131 § 1 KP) - KRYTYCZNE."""
        count = 0
        max_weekly_hours = self.scheduling_rules.get('max_weekly_work_hours', 48)
        max_weekly_minutes = int(max_weekly_hours * 60)
        
        # Oblicz rzeczywiste tygodnie kalendarzowe (poniedziałek-niedziela)
        first_day = date(self.year, self.month, 1)
        first_weekday = first_day.weekday()  # 0=Monday, 6=Sunday
        
        # Znajdź pierwszy poniedziałek w miesiącu (lub dzień 1 jeśli jest poniedziałkiem)
        if first_weekday == 0:  # Już poniedziałek
            first_monday = 1
        else:
            # Ile dni do najbliższego poniedziałku
            days_until_monday = (7 - first_weekday) % 7
            first_monday = 1 + days_until_monday
        
        # Buduj tygodnie kalendarzowe
        weeks = []
        current_week_start = 1  # Zawsze zaczynamy od dnia 1 (częściowy tydzień)
        
        # Pierwszy tydzień (może być częściowy - od dnia 1 do pierwszej niedzieli)
        if first_monday > 1:
            first_sunday = first_monday - 1
            weeks.append(list(range(1, min(first_sunday + 1, self.days_in_month + 1))))
            current_week_start = first_monday
        
        # Pełne tygodnie (poniedziałek-niedziela)
        while current_week_start <= self.days_in_month:
            week_end = min(current_week_start + 6, self.days_in_month)
            weeks.append(list(range(current_week_start, week_end + 1)))
            current_week_start = week_end + 1
        
        for emp_id in self.employee_by_id.keys():
            for week_days in weeks:
                # Zbierz wszystkie zmiany dla pracownika w tym tygodniu wraz z czasem trwania
                week_work_minutes = []
                for (e_id, d, t_id), var in self.shifts_vars.items():
                    if e_id == emp_id and d in week_days:
                        template = self.template_by_id[t_id]
                        duration = template['duration_minutes']
                        week_work_minutes.append(var * duration)
                
                if week_work_minutes:
                    # Suma godzin w tygodniu <= max_weekly_hours
                    self.model.Add(sum(week_work_minutes) <= max_weekly_minutes)
                    count += 1
        
        self.stats['hard_constraints'] += count
        print(f"  ✓ HC2: Max {max_weekly_hours}h/tydzień ({count} ograniczeń, {len(weeks)} tygodni)")
    

    def _add_daily_coverage_constraint(self):
        """HC9: Wymuszenie pokrycia wszystkich dni roboczych."""
        count = 0
        enable_trading_sundays = self.organization_settings.get('enable_trading_sundays', False)
        
        for day in self.all_days:
            # Pomiń niedziele niehandlowe
            if day in self.sundays_in_month:
                if not enable_trading_sundays or day not in self.trading_sunday_days:
                    continue
            
            # Zbierz wszystkie możliwe zmiany w tym dniu
            day_shifts = [
                var for (e_id, d, t_id), var in self.shifts_vars.items()
                if d == day
            ]
            
            if day_shifts:
                # Wymuszamy przynajmniej 1 zmianę w każdy dzień roboczy
                self.model.Add(sum(day_shifts) >= 1)
                count += 1
        
        self.stats['hard_constraints'] += count
        print(f"  ✓ HC9: Pokrycie dni roboczych ({count} dni wymaga obsady)")
    
    def _add_max_monthly_hours_constraint(self):
        """HC10: Maksymalna liczba godzin miesięcznie dla pracownika."""
        count = 0
        
        for emp_id, emp in self.employee_by_id.items():
            # Pobierz max_hours z danych pracownika
            max_hours = emp.get('max_hours')
            
            if max_hours is None:
                # Jeśli nie ma max_hours, użyj monthly_hours_norm jako fallback
                max_hours = self.data.get('monthly_hours_norm', 180)
            
            # Znajdź wszystkie zmiany tego pracownika
            employee_shifts = [
                (var, self.template_by_id[t_id]['duration_minutes'])
                for (e_id, d, t_id), var in self.shifts_vars.items()
                if e_id == emp_id
            ]
            
            if not employee_shifts:
                continue
            
            # Suma minut = suma(var * duration_minutes)
            total_minutes = sum(var * duration for var, duration in employee_shifts)
            
            # Max minuty
            max_minutes = int(max_hours * 60)
            
            # HARD CONSTRAINT: suma minut <= max_hours * 60
            self.model.Add(total_minutes <= max_minutes)
            count += 1
        
        self.stats['hard_constraints'] += count
        print(f"  ✓ HC10: Max godzin miesięcznie ({count} pracowników)")

    def add_soft_constraints(self):
        """
        Krok 3: Dodawanie ograniczeń miękkich (cele optymalizacyjne).
        Używamy funkcji celu do minimalizacji kar/maksymalizacji nagród.
        
        PRIORYTETY (wyższy = ważniejszy):
        - SC1: Wypełnienie godzin etatu (5000 pkt/godz) - NAJWYŻSZY
        - SC5: Sprawiedliwe weekendy (2000 pkt) - 95% priorytet
        - SC6: Równomierna obsada dzienna (1500 pkt) - WYSOKI
        - SC7: Sprawiedliwe zmiany tygodniowe (500 pkt) - 75% priorytet
        - SC4: Równomierne rozłożenie ogólne (100 pkt)
        - SC2/SC3: Preferencje i manager (50 pkt)
        """
        print("\n🎯 Dodawanie celów optymalizacyjnych...")
        
        objective_terms = []
        
        # SC1: Zgodność z etatem - kara za odchylenie od docelowych godzin (PRIORYTET 1)
        penalty_terms_etat = self._add_employment_type_objective()
        objective_terms.extend(penalty_terms_etat)
        
        # SC5: Sprawiedliwe weekendy - 95% priorytet (PRIORYTET 2)
        penalty_terms_weekends = self._add_fair_weekend_distribution_objective()
        objective_terms.extend(penalty_terms_weekends)
        
        # SC6: Równomierna obsada dzienna ±1 pracownik (PRIORYTET 3)
        penalty_terms_daily = self._add_balanced_daily_staffing_objective()
        objective_terms.extend(penalty_terms_daily)
        
        # SC7: Sprawiedliwe zmiany miesięczne - 75% priorytet (PRIORYTET 4)
        penalty_terms_monthly = self._add_fair_monthly_distribution_objective()
        objective_terms.extend(penalty_terms_monthly)
        
        # SC4: Równomierne rozłożenie zmian ogólne (PRIORYTET 5)
        penalty_terms_balance = self._add_balanced_distribution_objective()
        objective_terms.extend(penalty_terms_balance)
        
        # SC2: Preferencje godzinowe - nagroda za zgodność
        reward_terms_prefs = self._add_time_preferences_objective()
        objective_terms.extend(reward_terms_prefs)
        
        # SC3: Mix kompetencji - premia za obecność managera
        reward_terms_manager = self._add_manager_presence_objective()
        objective_terms.extend(reward_terms_manager)
        
        # Funkcja celu: maksymalizuj (nagrody - kary)
        if objective_terms:
            self.model.Maximize(sum(objective_terms))
            print(f"✅ Funkcja celu zawiera {len(objective_terms)} składników")
        else:
            # Jeśli brak soft constraints, maksymalizujemy liczbę przypisanych zmian
            all_shifts_sum = sum(var for var in self.shifts_vars.values())
            self.model.Maximize(all_shifts_sum)
            print("⚠️  Brak składników soft constraints - maksymalizuję liczbę zmian")
    
    def _calculate_average_shift_duration(self, emp_id: str) -> float:
        """
        Oblicza średnią długość zmian dla pracownika na podstawie dostępnych szablonów.
        Używane do obliczenia odliczenia za urlopy.
        
        Returns:
            Średnia długość zmiany w godzinach (fallback: 8.0h)
        """
        # Znajdź wszystkie szablony dostępne dla tego pracownika
        available_templates = []
        for template in self.shift_templates:
            # Sprawdź czy istnieje choć jedna zmienna dla tego pracownika i szablonu
            has_vars = any(
                e_id == emp_id and t_id == template['id']
                for (e_id, d, t_id) in self.shifts_vars.keys()
            )
            if has_vars:
                available_templates.append(template)
        
        if not available_templates:
            # Fallback: standardowe 8h
            return 8.0
        
        # Oblicz średnią długość zmian (bez przerw - to czas faktyczny pracy)
        total_minutes = sum(t['duration_minutes'] for t in available_templates)
        avg_minutes = total_minutes / len(available_templates)
        avg_hours = avg_minutes / 60.0
        
        return avg_hours
    
    def _calculate_absence_hours_deduction(self, emp_id: str, employment_type: str) -> float:
        """
        Oblicza ile godzin odjąć od target_hours z powodu urlopów/nieobecności.
        
        ZASADA (zgodnie z KP):
        Urlop jest udzielany w godzinach odpowiadających dobowemu wymiarowi czasu pracy w danym dniu.
        - Jeśli pracownik miał pracować 12h → odejmujemy 12h
        - Jeśli pracownik miał pracować 8h → odejmujemy 8h
        - Jeśli pracownik miał pracować 4h → odejmujemy 4h
        
        W momencie generowania grafiku nie znamy jeszcze rozkładu, więc:
        1. Obliczamy średnią długość zmian z dostępnych szablonów dla tego pracownika
        2. Mnożymy przez liczbę dni roboczych urlopu (Pn-Pt, bez świąt)
        3. Skalujemy przez mnożnik etatu (dla niepełnych etatów)
        
        Args:
            emp_id: ID pracownika
            employment_type: Typ etatu ('full', 'half', etc.)
            
        Returns:
            Liczba godzin do odjęcia od target_hours
        """
        # DEBUG: Sprawdź czy w ogóle są dane o nieobecnościach
        total_absences_in_system = len(self.absence_set)
        absences_for_emp = [(e, d) for (e, d) in self.absence_set if e == emp_id]
        
        print(f"      🔍 DEBUG {emp_id[:12]}: Total absences in system: {total_absences_in_system}, For this emp: {len(absences_for_emp)}")
        if absences_for_emp:
            print(f"         Absence days: {[d for (e, d) in absences_for_emp]}")
        
        # Mnożniki etatu (dla proporcji w niepełnych etatach)
        etat_multipliers = {
            'full': 1.0,
            'three_quarter': 0.75,
            'half': 0.5,
            'one_third': 0.333,
            'custom': 1.0  # Custom - nie skalujemy, bo custom_hours już uwzględnia proporcje
        }
        
        multiplier = etat_multipliers.get(employment_type, 1.0)
        
        # Oblicz średnią długość zmiany dla tego pracownika
        avg_shift_hours = self._calculate_average_shift_duration(emp_id)
        
        print(f"         Avg shift duration: {avg_shift_hours:.1f}h, Etat multiplier: {multiplier}")
        
        total_absence_days = 0
        
        # Policz dni robocze nieobecności w miesiącu (Pn-Pt, bez świąt)
        for day in self.all_days:
            if (emp_id, day) in self.absence_set:
                current_date = date(self.year, self.month, day)
                weekday = current_date.weekday()
                
                # Tylko dni robocze (Pn-Pt)
                if weekday < 5:  # 0=Monday, 4=Friday
                    # TODO: Ewentualnie dodać sprawdzanie świąt ustawowych
                    total_absence_days += 1
        
        # Godziny do odjęcia = dni urlopu × średnia długość zmiany × mnożnik etatu
        deduction_hours = total_absence_days * avg_shift_hours * multiplier
        
        if deduction_hours > 0:
            print(f"    • {emp_id[:12]}: {total_absence_days} dni urlopu × {avg_shift_hours:.1f}h (śr. zmiana) × {multiplier} etatu = -{deduction_hours:.1f}h")
        
        return deduction_hours
    
    def _add_employment_type_objective(self) -> List:
        """SC1: Kara za odchylenie od oczekiwanych godzin według etatu.
        
        KLUCZOWE: max_hours to docelowa norma godzin (np. 176h dla full-time),
        a nie absolutne maksimum. Solver powinien dążyć do wypełnienia tej normy.
        """
        terms = []
        
        # Pobierz normę godzin z API jako fallback
        monthly_hours_norm = self.data.get('monthly_hours_norm')
        
        # Wagi kar - asymetryczne!
        # Kara za niedopracowanie jest ZNACZNIE większa niż za nadpracowanie
        penalty_underschedule = 5000  # Duża kara za każdą brakującą godzinę
        penalty_overschedule = 100    # Mała kara za nadgodziny (i tak HC10 blokuje)
        
        print("  ⚙️  SC1: Obliczam target hours do wypełnienia:")
        
        for emp_id, emp in self.employee_by_id.items():
            employment_type = emp.get('employment_type', 'full')
            
            # TARGET HOURS = max_hours z API (to jest norma etatu, nie absolutne max)
            target_hours = emp.get('max_hours')
            
            if target_hours is None:
                # Fallback: oblicz z monthly_hours_norm
                if monthly_hours_norm is not None:
                    etat_multipliers = {
                        'full': 1.0, 'three_quarter': 0.75, 'half': 0.5, 'one_third': 0.333
                    }
                    multiplier = etat_multipliers.get(employment_type, 1.0)
                    target_hours = monthly_hours_norm * multiplier
                else:
                    target_hours = 160  # Ostateczny fallback
            
            # Odejmij urlopy od target
            absence_deduction = self._calculate_absence_hours_deduction(emp_id, employment_type)
            target_hours = max(0, target_hours - absence_deduction)
            
            print(f"    • {emp_id[:12]}: target={target_hours:.0f}h (po urlopach: -{absence_deduction:.0f}h)")
            
            # Oblicz sumę minut przepracowanych w miesiącu
            employee_shifts = [
                (var, self.template_by_id[t_id]['duration_minutes'])
                for (e_id, d, t_id), var in self.shifts_vars.items()
                if e_id == emp_id
            ]
            
            if not employee_shifts:
                continue
            
            # Suma minut = suma(var * duration_minutes)
            total_minutes = sum(var * duration for var, duration in employee_shifts)
            
            # Docelowe minuty
            target_minutes = int(target_hours * 60)
            
            # Zmienne pomocnicze dla odchylenia
            # deviation_neg = ile brakuje (niedopracowane)
            # deviation_pos = ile za dużo (nadpracowane)
            max_deviation = max(target_minutes * 2, 20000)  # Max 333h odchylenia
            deviation_pos = self.model.NewIntVar(0, max_deviation, f'dev_pos_{emp_id[:8]}')
            deviation_neg = self.model.NewIntVar(0, max_deviation, f'dev_neg_{emp_id[:8]}')
            
            # total_minutes - target_minutes = deviation_pos - deviation_neg
            self.model.Add(total_minutes - target_minutes == deviation_pos - deviation_neg)
            
            # ASYMETRYCZNE KARY:
            # - Niedopracowanie (deviation_neg): duża kara
            # - Nadpracowanie (deviation_pos): mała kara
            penalty_under_per_minute = penalty_underschedule / 60
            penalty_over_per_minute = penalty_overschedule / 60
            
            term = -1 * (int(penalty_under_per_minute) * deviation_neg + 
                        int(penalty_over_per_minute) * deviation_pos)
            terms.append(term)
            
            self.stats['soft_constraints'] += 1
        
        print(f"  ✓ SC1: Zgodność z etatem ({self.stats['soft_constraints']} pracowników)")
        return terms
    
    def _add_time_preferences_objective(self) -> List:
        """SC2: Nagroda za zgodność z preferencjami czasowymi."""
        terms = []
        reward_per_match = 50  # Punkty nagrody za zgodność
        
        for emp_id in self.employee_by_id.keys():
            prefs = self.prefs_by_employee.get(emp_id)
            if not prefs:
                continue
            
            preferred_start = prefs.get('preferred_start_time')
            if not preferred_start:
                continue
            
            preferred_start_minutes = self._time_to_minutes(preferred_start)
            tolerance_minutes = 60  # Tolerancja +/- 1h
            
            # Dla każdej zmiany pracownika, sprawdź zgodność
            for (e_id, d, t_id), var in self.shifts_vars.items():
                if e_id != emp_id:
                    continue
                
                template = self.template_by_id[t_id]
                shift_start = template['start_time_minutes']
                
                # Czy zmiana zaczyna się w preferowanym czasie?
                if abs(shift_start - preferred_start_minutes) <= tolerance_minutes:
                    terms.append(reward_per_match * var)
        
        print(f"  ✓ SC2: Preferencje godzinowe ({len(terms)} potencjalnych nagród)")
        return terms
    
    def _add_manager_presence_objective(self) -> List:
        """SC3: Premia za obecność managera na każdej zmianie."""
        terms = []
        reward_per_manager_shift = 200  # Wysoka waga
        
        if not self.manager_ids:
            print("  ⚠️  SC3: Brak managerów - pomijam")
            return terms
        
        for day in self.all_days:
            for template in self.shift_templates:
                template_id = template['id']
                
                # Znajdź managerów dostępnych na tę zmianę
                manager_vars = [
                    var for (e_id, d, t_id), var in self.shifts_vars.items()
                    if d == day and t_id == template_id and e_id in self.manager_ids
                ]
                
                if manager_vars:
                    # Stwórz zmienną bool: czy jest przynajmniej jeden manager?
                    has_manager = self.model.NewBoolVar(f'has_mgr_d{day}_t{template_id[:8]}')
                    
                    # has_manager == 1 jeśli suma(manager_vars) >= 1
                    self.model.Add(sum(manager_vars) >= 1).OnlyEnforceIf(has_manager)
                    self.model.Add(sum(manager_vars) == 0).OnlyEnforceIf(has_manager.Not())
                    
                    terms.append(reward_per_manager_shift * has_manager)
        
        print(f"  ✓ SC3: Obecność managera ({len(terms)} zmian)")
        return terms
    
    def _add_fair_weekend_distribution_objective(self) -> List:
        """SC5: Sprawiedliwe rozłożenie weekendów między pracowników (95% priorytet).
        
        Każdy pracownik powinien mieć podobną liczbę sobót i niedziel handlowych.
        """
        terms = []
        penalty_per_weekend_deviation = 2000  # Wysoka waga - 95% priorytet
        
        # Znajdź dni weekendowe (soboty + niedziele handlowe)
        weekend_days = []
        enable_trading_sundays = self.organization_settings.get('enable_trading_sundays', False)
        
        for day in self.all_days:
            day_date = date(self.year, self.month, day)
            weekday = day_date.weekday()
            
            if weekday == 5:  # Sobota
                weekend_days.append(day)
            elif weekday == 6 and enable_trading_sundays and day in self.trading_sunday_days:
                # Niedziela handlowa
                weekend_days.append(day)
        
        if not weekend_days:
            print("  ⚠️  SC5: Brak dni weekendowych do rozłożenia")
            return terms
        
        num_employees = len(self.employee_by_id)
        if num_employees == 0:
            return terms
        
        # Oblicz docelową liczbę weekendów na pracownika
        # Zakładamy że każdy pracownik powinien pracować podobną liczbę weekendów
        total_weekend_shifts = sum(
            len([var for (e_id, d, t_id), var in self.shifts_vars.items() if d == day])
            for day in weekend_days
        ) / num_employees if num_employees > 0 else 0
        
        # Dla każdego pracownika oblicz odchylenie od średniej liczby weekendów
        for emp_id in self.employee_by_id.keys():
            # Suma zmian weekendowych dla pracownika
            weekend_shift_vars = [
                var for (e_id, d, t_id), var in self.shifts_vars.items()
                if e_id == emp_id and d in weekend_days
            ]
            
            if not weekend_shift_vars:
                continue
            
            total_weekend_shifts_emp = sum(weekend_shift_vars)
            target_weekends = len(weekend_days) // num_employees  # Równy podział
            
            # Odchylenie od docelowej liczby weekendów
            max_dev = len(weekend_days)
            deviation_pos = self.model.NewIntVar(0, max_dev, f'wknd_pos_{emp_id[:8]}')
            deviation_neg = self.model.NewIntVar(0, max_dev, f'wknd_neg_{emp_id[:8]}')
            
            self.model.Add(total_weekend_shifts_emp - target_weekends == deviation_pos - deviation_neg)
            
            # Kara za każdy weekend odchylenia
            terms.append(-penalty_per_weekend_deviation * (deviation_pos + deviation_neg))
        
        print(f"  ✓ SC5: Sprawiedliwe weekendy ({len(weekend_days)} dni weekendowych, {num_employees} pracowników)")
        return terms
    
    def _add_balanced_daily_staffing_objective(self) -> List:
        """SC6: Równomierna obsada dzienna - różnica max ±1 pracownik między dniami.
        
        Każdy dzień powinien mieć podobną liczbę pracowników na zmianach.
        """
        terms = []
        penalty_per_staffing_deviation = 1500  # Wysoka waga
        
        enable_trading_sundays = self.organization_settings.get('enable_trading_sundays', False)
        
        # Zbierz wszystkie dni robocze
        working_days = []
        for day in self.all_days:
            if day in self.sundays_in_month:
                if not enable_trading_sundays or day not in self.trading_sunday_days:
                    continue
            working_days.append(day)
        
        if len(working_days) < 2:
            return terms
        
        # Oblicz średnią obsadę dzienną
        total_daily_vars = []
        for day in working_days:
            day_vars = [var for (e_id, d, t_id), var in self.shifts_vars.items() if d == day]
            if day_vars:
                total_daily_vars.append((day, sum(day_vars)))
        
        if not total_daily_vars:
            return terms
        
        # Oblicz docelową obsadę jako sumę min_employees dla wszystkich szablonów
        target_daily_staffing = sum(
            template.get('min_employees', 1) 
            for template in self.shift_templates
        )
        
        # Dla każdego dnia minimalizuj odchylenie od target ±1
        for day, day_sum in total_daily_vars:
            # Zezwalamy na ±1 bez kary, karamy większe odchylenia
            max_dev = len(self.employee_by_id)
            deviation = self.model.NewIntVar(0, max_dev, f'daily_dev_{day}')
            
            # |day_sum - target| - 1 <= deviation (odejmujemy 1 bo ±1 jest OK)
            diff_pos = self.model.NewIntVar(0, max_dev, f'daily_diff_pos_{day}')
            diff_neg = self.model.NewIntVar(0, max_dev, f'daily_diff_neg_{day}')
            
            self.model.Add(day_sum - target_daily_staffing == diff_pos - diff_neg)
            
            # Kara tylko za odchylenie > 1
            # deviation = max(0, |diff| - 1) - aproksymacja przez karę za całość
            terms.append(-penalty_per_staffing_deviation * (diff_pos + diff_neg))
        
        print(f"  ✓ SC6: Równomierna obsada dzienna ({len(working_days)} dni, target: {target_daily_staffing}/dzień)")
        return terms
    
    def _add_fair_monthly_distribution_objective(self) -> List:
        """SC7: Sprawiedliwe rozłożenie zmian miesięcznych (75% priorytet).
        
        Wszyscy pracownicy mają podobną całkowitą liczbę zmian w miesiącu.
        """
        terms = []
        penalty_per_monthly_deviation = SoftConstraintWeights.SC7_PENALTY_MONTHLY_DEVIATION
        
        num_employees = len(self.employee_by_id)
        if num_employees == 0:
            return terms
        
        # Oblicz średnią liczbę zmian na pracownika w miesiącu
        total_shifts_available = len(self.shifts_vars)
        if total_shifts_available == 0:
            return terms
        
        avg_monthly_shifts = total_shifts_available / num_employees
        target_monthly = int(avg_monthly_shifts)
        
        # Dla każdego pracownika
        for emp_id in self.employee_by_id.keys():
            # Suma wszystkich zmian dla pracownika w miesiącu
            monthly_shift_vars = [
                var for (e_id, d, t_id), var in self.shifts_vars.items()
                if e_id == emp_id
            ]
            
            if not monthly_shift_vars:
                continue
            
            total_monthly_shifts = sum(monthly_shift_vars)
            
            # Odchylenie od średniej miesięcznej
            max_dev = len(monthly_shift_vars)
            deviation_pos = self.model.NewIntVar(0, max_dev, f'month_pos_{emp_id[:8]}')
            deviation_neg = self.model.NewIntVar(0, max_dev, f'month_neg_{emp_id[:8]}')
            
            self.model.Add(total_monthly_shifts - target_monthly == deviation_pos - deviation_neg)
            
            # Kara za odchylenie od średniej miesięcznej
            terms.append(-penalty_per_monthly_deviation * (deviation_pos + deviation_neg))
        
        print(f"  ✓ SC7: Sprawiedliwe zmiany miesięczne (target: {target_monthly} zmian/pracownik, {num_employees} pracowników)")
        return terms

    def _add_balanced_distribution_objective(self) -> List:
        """SC4: Kara za nierównomierne rozłożenie zmian między pracowników."""
        terms = []
        
        # Oblicz średnią liczbę zmian na pracownika
        total_required_shifts = sum(
            template.get('min_employees', 1) * len(self.all_days)
            for template in self.shift_templates
        )
        num_employees = len(self.employee_by_id)
        
        if num_employees == 0:
            return terms
        
        avg_shifts_per_employee = total_required_shifts / num_employees
        penalty_per_shift_deviation = 10
        
        for emp_id in self.employee_by_id.keys():
            # Suma zmian dla pracownika
            employee_shift_vars = [
                var for (e_id, d, t_id), var in self.shifts_vars.items()
                if e_id == emp_id
            ]
            
            if not employee_shift_vars:
                continue
            
            total_shifts = sum(employee_shift_vars)
            target = int(avg_shifts_per_employee)
            
            # Odchylenie od średniej
            deviation_pos = self.model.NewIntVar(0, len(employee_shift_vars), f'bal_pos_{emp_id[:8]}')
            deviation_neg = self.model.NewIntVar(0, len(employee_shift_vars), f'bal_neg_{emp_id[:8]}')
            
            self.model.Add(total_shifts - target == deviation_pos - deviation_neg)
            
            terms.append(-penalty_per_shift_deviation * (deviation_pos + deviation_neg))
        
        print(f"  ✓ SC4: Równomierne rozłożenie ({len(self.employee_by_id)} pracowników)")
        return terms
    
    def solve(self, time_limit_seconds: int = 300) -> Dict:
        """
        Krok 4: Rozwiązanie problemu CP-SAT.
        
        Args:
            time_limit_seconds: Maksymalny czas rozwiązywania w sekundach
            
        Returns:
            Dict z wynikami: status, shifts, statistics
        """
        print(f"\n🚀 Uruchamiam solver CP-SAT (limit: {time_limit_seconds}s)...")
        
        # Diagnostyka przed solve
        print(f"  • Zmiennych decyzyjnych: {len(self.shifts_vars)}")
        print(f"  • Ograniczeń twardych: {self.stats['hard_constraints']}")
        print(f"  • Ograniczeń miękkich: {self.stats['soft_constraints']}")
        
        if not self.shifts_vars:
            print("❌ BŁĄD: Brak zmiennych decyzyjnych!")
            return {
                'status': 'ERROR',
                'error': 'Brak zmiennych decyzyjnych - sprawdź konfigurację',
                'success': False,
                'shifts': [],
                'statistics': {}
            }
        
        # Parametry solvera
        self.solver.parameters.max_time_in_seconds = time_limit_seconds
        self.solver.parameters.log_search_progress = False  # Wyłącz verbose logging
        self.solver.parameters.num_search_workers = 8  # Wielowątkowość
        
        # Rozwiąż
        status = self.solver.Solve(self.model)
        
        # Analiza wyniku
        result = self._process_solution(status)
        return result
    
    def _process_solution(self, status) -> Dict:
        """Przetwarza wynik solvera i tworzy strukturę odpowiedzi."""
        
        status_name = self.solver.StatusName(status)
        print(f"\n📊 Status: {status_name}")
        
        if status == cp_model.OPTIMAL:
            print("✅ Znaleziono OPTYMALNE rozwiązanie!")
        elif status == cp_model.FEASIBLE:
            print("✅ Znaleziono DOPUSZCZALNE rozwiązanie (nie koniecznie optymalne)")
        elif status == cp_model.INFEASIBLE:
            print("❌ Problem NIEMOŻLIWY DO ROZWIĄZANIA")
            return self._handle_infeasibility()
        elif status == cp_model.MODEL_INVALID:
            print("❌ Model jest NIEPRAWIDŁOWY")
            return {'status': 'MODEL_INVALID', 'error': 'Invalid model structure', 'success': False}
        elif status == cp_model.UNKNOWN:
            print("⚠️  Status UNKNOWN - brak zmiennych lub ograniczeń?")
            # Sprawdź czy mamy w ogóle zmienne
            if not self.shifts_vars:
                return {
                    'status': 'UNKNOWN',
                    'error': 'Brak zmiennych decyzyjnych - sprawdź konfigurację szablonów i pracowników',
                    'success': False,
                    'shifts': [],
                    'statistics': {}
                }
            # Jeśli mamy zmienne, to może być problem z pustym modelem
            # Zwróć pusty grafik z wyjaśnieniem
            return {
                'status': 'UNKNOWN',
                'error': 'Model nie znalazł rozwiązania - możliwe problemy z konfiguracją',
                'success': True,  # Techniczny sukces (brak błędu), ale pusty wynik
                'shifts': [],
                'statistics': {
                    'status': status_name,
                    'solve_time_seconds': self.solver.WallTime(),
                    'total_shifts_assigned': 0,
                    'total_variables': self.stats['total_variables']
                },
                'year': self.year,
                'month': self.month
            }
        else:
            print(f"⚠️  Status nieoczekiwany: {status_name}")
            return {'status': status_name, 'shifts': [], 'statistics': {}, 'success': False}
        
        # Ekstrakcja rozwiązania
        shifts_output = []
        
        for (emp_id, day, template_id), var in self.shifts_vars.items():
            if self.solver.Value(var) == 1:
                template = self.template_by_id[template_id]
                employee = self.employee_by_id[emp_id]
                
                shift_date = date(self.year, self.month, day)
                
                shift_record = {
                    'employee_id': emp_id,
                    'employee_name': f"{employee['first_name']} {employee['last_name']}",
                    'date': shift_date.isoformat(),
                    'start_time': template['start_time'],
                    'end_time': template['end_time'],
                    'break_minutes': template.get('break_minutes', 0),
                    'template_id': template_id,
                    'template_name': template['name'],
                    'color': employee.get('color') or template.get('color'),
                    'notes': None
                }
                
                shifts_output.append(shift_record)
        
        # Statystyki
        objective_value = self.solver.ObjectiveValue() if status in [cp_model.OPTIMAL, cp_model.FEASIBLE] else 0
        
        # Oblicz quality_percent - normalizuj objective_value do 0-100%
        # objective_value to suma nagród (+) i kar (-), może być ujemny
        quality_percent = self._calculate_quality_percent(objective_value, len(shifts_output))
        
        statistics = {
            'status': status_name,
            'objective_value': objective_value,
            'quality_percent': quality_percent,
            'solve_time_seconds': self.solver.WallTime(),
            'total_shifts_assigned': len(shifts_output),
            'total_variables': self.stats['total_variables'],
            'hard_constraints': self.stats['hard_constraints'],
            'soft_constraints': self.stats['soft_constraints'],
            'conflicts': self.solver.NumConflicts(),
            'branches': self.solver.NumBranches()
        }
        
        print(f"\n📈 Statystyki:")
        print(f"  • Przypisanych zmian: {len(shifts_output)}")
        print(f"  • Czas rozwiązywania: {statistics['solve_time_seconds']:.2f}s")
        print(f"  • Wartość funkcji celu: {statistics['objective_value']}")
        print(f"  • Konfliktów: {statistics['conflicts']}")
        print(f"  • Gałęzi: {statistics['branches']}")
        
        return {
            'status': 'SUCCESS',
            'shifts': shifts_output,
            'statistics': statistics,
            'year': self.year,
            'month': self.month
        }
    
    def _handle_infeasibility(self) -> Dict:
        """
        Obsługa przypadku INFEASIBLE - diagnoza przyczyn.
        Zwraca szczegółowe informacje do wyświetlenia w AI dialog.
        """
        print("\n🔍 DIAGNOZA NIEMOŻLIWOŚCI ROZWIĄZANIA:")
        
        reasons = []
        ai_messages = []  # Czytelne komunikaty dla użytkownika w AI dialog
        
        # Sprawdź pokrycie zmian
        print("\n1. Sprawdzam wymagania obsady zmian...")
        total_required = 0
        total_possible_assignments = 0
        enable_trading_sundays = self.organization_settings.get('enable_trading_sundays', False)
        
        for day in self.all_days:
            # Pomiń niedziele niehandlowe przy liczeniu wymagań
            if day in self.sundays_in_month:
                if not enable_trading_sundays or day not in self.trading_sunday_days:
                    continue
            
            for template in self.shift_templates:
                # Sprawdź czy szablon jest dostępny w ten dzień
                if not self._is_template_applicable_on_day(template, day):
                    continue
                min_emp = template.get('min_employees', 1)
                total_required += min_emp
        
        # Oblicz całkowitą możliwą liczbę godzin zmian
        total_shift_hours = sum(
            t['duration_minutes'] / 60 for t in self.shift_templates
        ) * total_required
        
        # Oblicz całkowitą dostępną liczbę godzin pracowników
        monthly_hours_norm = self.data.get('monthly_hours_norm', 160)
        num_employees = len(self.employee_by_id)
        total_available_hours = num_employees * monthly_hours_norm
        
        print(f"   Całkowita wymagana liczba przypisań: {total_required}")
        print(f"   Dostępne zmienne decyzyjne: {len(self.shifts_vars)}")
        print(f"   Wymagane godziny zmian: ~{total_shift_hours:.0f}h")
        print(f"   Dostępne godziny pracowników: ~{total_available_hours:.0f}h")
        
        if len(self.shifts_vars) < total_required:
            reason = f"Za mało dostępnych pracowników/zmiennych ({len(self.shifts_vars)}) względem wymagań ({total_required})"
            reasons.append(reason)
            ai_messages.append(f"❌ Za mało pracowników: potrzebujesz {total_required} przypisań do zmian, ale dostępnych jest tylko {len(self.shifts_vars)} możliwości.")
            print(f"   ❌ {reason}")
        
        if total_shift_hours > total_available_hours * 1.2:  # 20% buffer (dajemy więcej elastyczności)
            reason = f"Za mało godzin pracowniczych ({total_available_hours:.0f}h) na pokrycie wymaganych zmian ({total_shift_hours:.0f}h)"
            reasons.append(reason)
            shortage = total_shift_hours - total_available_hours
            additional_etats = shortage / monthly_hours_norm
            ai_messages.append(f"❌ Brakuje godzin pracy - potrzeba ~{additional_etats:.1f} etatu więcej")
            print(f"   ❌ {reason}")
        
        # Sprawdź nieobecności
        print("\n2. Sprawdzam nieobecności pracowników...")
        absence_days_count = len(self.absence_set)
        print(f"   Dni nieobecności: {absence_days_count}")
        
        absence_ratio = absence_days_count / (len(self.employee_by_id) * len(self.all_days)) if self.employee_by_id else 0
        if absence_ratio > 0.3:
            reason = f"Wysoki poziom nieobecności ({absence_ratio*100:.0f}% dni)"
            reasons.append(reason)
            ai_messages.append(f"⚠️ Dużo nieobecności: {absence_ratio*100:.0f}% wszystkich dni pracowniczych jest niedostępnych (urlopy, zwolnienia).")
            print(f"   ⚠️  {reason}")
        
        # Sprawdź niedziele handlowe
        print("\n3. Sprawdzam konfigurację niedziel...")
        print(f"   Niedziele handlowe włączone: {enable_trading_sundays}")
        print(f"   Niedziele w miesiącu: {self.sundays_in_month}")
        print(f"   Niedziele handlowe: {sorted(self.trading_sunday_days) if self.trading_sunday_days else 'brak'}")
        
        # Zmienne dla niedziel (nie powinno ich być dla niehandlowych)
        sundays_with_vars = set()
        for (e, d, t) in self.shifts_vars.keys():
            if d in self.sundays_in_month:
                sundays_with_vars.add(d)
        
        if sundays_with_vars:
            unexpected = sundays_with_vars - self.trading_sunday_days
            if unexpected:
                reason = f"Błąd: utworzono zmienne dla niedziel niehandlowych: {sorted(unexpected)}"
                reasons.append(reason)
                print(f"   ❌ {reason}")
        
        # Sprawdź maksymalne ciągłe dni
        print("\n4. Sprawdzam ograniczenia max dni z rzędu...")
        max_consecutive = self.scheduling_rules.get('max_consecutive_days', 6)
        print(f"   Max dni z rzędu: {max_consecutive}")
        
        if max_consecutive < 5:
            reason = f"Bardzo restrykcyjne ograniczenie max_consecutive_days: {max_consecutive}"
            reasons.append(reason)
            ai_messages.append(f"⚠️ Bardzo restrykcyjne ustawienie: max {max_consecutive} dni pracy z rzędu może być trudne do spełnienia.")
            print(f"   ⚠️  {reason}")
        
        # Sprawdź odpoczynek dobowy
        print("\n5. Sprawdzam konflikty odpoczynku dobowego...")
        min_rest = self.scheduling_rules.get('min_daily_rest_hours', 11)
        print(f"   Minimalny odpoczynek: {min_rest}h")
        
        # Sprawdź czy zmiany są kompatybilne z odpoczynkiem
        incompatible_pairs = 0
        for t1 in self.shift_templates:
            for t2 in self.shift_templates:
                rest = self._calculate_rest_time(t1['end_time_minutes'], t2['start_time_minutes'])
                if rest < min_rest * 60:
                    incompatible_pairs += 1
        
        if incompatible_pairs > 0:
            print(f"   ⚠️ {incompatible_pairs} par zmian nie spełnia 11h odpoczynku")
        
        # Podsumowanie
        print("\n" + "="*60)
        print("MOŻLIWE PRZYCZYNY NIEMOŻLIWOŚCI:")
        if reasons:
            for i, reason in enumerate(reasons, 1):
                print(f"{i}. {reason}")
        else:
            reasons.append("Kombinacja wielu ograniczeń jest zbyt restrykcyjna")
            ai_messages.append("❌ Nie udało się ułożyć grafiku. Kombinacja ograniczeń (godziny, odpoczynki, nieobecności) sprawia, że nie ma możliwego rozwiązania.")
            print("Nie zidentyfikowano oczywistych przyczyn.")
            print("Prawdopodobnie kombinacja wielu ograniczeń jest zbyt restrykcyjna.")
        print("="*60)
        
        # Sugestie specyficzne dla problemu
        suggestions = []
        if total_shift_hours > total_available_hours:
            suggestions.append(f"Dodaj więcej pracowników (potrzeba ~{(total_shift_hours - total_available_hours) / monthly_hours_norm:.1f} etatu więcej)")
            suggestions.append("Zmniejsz min_employees w szablonach zmian")
        if absence_ratio > 0.3:
            suggestions.append("Rozważ przesunięcie części urlopów na inny miesiąc")
        suggestions.extend([
            "Sprawdź czy wszystkie szablony zmian są poprawnie skonfigurowane",
            "Rozważ zwiększenie max_consecutive_days w ustawieniach",
            "Sprawdź czy nie ma konfliktów w preferencjach pracowników"
        ])
        
        return {
            'status': 'INFEASIBLE',
            'error': 'Nie udało się ułożyć grafiku - zbyt restrykcyjne ograniczenia',
            'reasons': reasons,
            'ai_messages': ai_messages,  # Do wyświetlenia w AI dialog
            'statistics': {
                'total_variables': self.stats['total_variables'],
                'hard_constraints': self.stats['hard_constraints'],
                'total_required_assignments': total_required,
                'absence_days': absence_days_count,
                'total_employees': num_employees,
                'required_shift_hours': round(total_shift_hours),
                'available_employee_hours': round(total_available_hours)
            },
            'suggestions': suggestions
        }


def generate_schedule_optimized(input_data: Dict) -> Dict:
    """
    Główna funkcja API do generowania grafiku.
    
    Args:
        input_data: Słownik z danymi wejściowymi z bazy danych
        
    Returns:
        Dict z wygenerowanymi zmianami i statystykami
    """
    print("="*80)
    print("🏢 CALENDA SCHEDULE - CP-SAT OPTIMIZER")
    print("="*80)
    
    try:
        # Walidacja danych wejściowych
        required_keys = ['year', 'month', 'employees', 'shift_templates', 'organization_settings']
        for key in required_keys:
            if key not in input_data:
                return {
                    'status': 'ERROR',
                    'error': f'Missing required field: {key}',
                    'shifts': []
                }
        
        # Utwórz optimizer
        optimizer = ScheduleOptimizer(input_data)
        
        # Krok 1: Zmienne decyzyjne
        optimizer.create_decision_variables()
        
        # Krok 2: Ograniczenia twarde
        optimizer.add_hard_constraints()
        
        # Krok 3: Cele optymalizacyjne
        optimizer.add_soft_constraints()
        
        # Krok 4: Rozwiąż
        time_limit = input_data.get('solver_time_limit', 300)
        result = optimizer.solve(time_limit_seconds=time_limit)
        
        return result
        
    except Exception as e:
        print(f"\n❌ BŁĄD: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'status': 'ERROR',
            'error': str(e),
            'traceback': traceback.format_exc(),
            'shifts': []
        }


# =============================================================================
# PRZYKŁAD UŻYCIA
# =============================================================================

if __name__ == "__main__":
    # Przykładowe dane testowe
    sample_input = {
        'year': 2026,
        'month': 2,  # Luty 2026
        'organization_settings': {
            'store_open_time': '08:00:00',
            'store_close_time': '20:00:00',
            'min_employees_per_shift': 2,
            'enable_trading_sundays': True
        },
        'shift_templates': [
            {
                'id': 'template-1',
                'name': 'Poranna',
                'start_time': '08:00:00',
                'end_time': '16:00:00',
                'break_minutes': 30,
                'min_employees': 2,
                'max_employees': 3,
                'color': '#FF6B6B',
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            },
            {
                'id': 'template-2',
                'name': 'Popołudniowa',
                'start_time': '12:00:00',
                'end_time': '20:00:00',
                'break_minutes': 30,
                'min_employees': 2,
                'max_employees': 3,
                'color': '#4ECDC4',
                'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            }
        ],
        'employees': [
            {
                'id': 'emp-1',
                'first_name': 'Jan',
                'last_name': 'Kowalski',
                'position': 'Manager',
                'employment_type': 'full',
                'is_active': True,
                'color': '#FF6B6B'
            },
            {
                'id': 'emp-2',
                'first_name': 'Anna',
                'last_name': 'Nowak',
                'position': 'Pracownik',
                'employment_type': 'full',
                'is_active': True,
                'color': '#4ECDC4'
            },
            {
                'id': 'emp-3',
                'first_name': 'Piotr',
                'last_name': 'Wiśniewski',
                'position': 'Pracownik',
                'employment_type': 'half',
                'is_active': True,
                'color': '#95E1D3'
            }
        ],
        'employee_preferences': [
            {
                'employee_id': 'emp-1',
                'preferred_start_time': '08:00:00',
                'max_hours_per_week': 40,
                'can_work_weekends': True,
                'preferred_days': [0, 1, 2, 3, 4],  # Poniedziałek-Piątek
                'unavailable_days': []
            },
            {
                'employee_id': 'emp-2',
                'preferred_start_time': '12:00:00',
                'max_hours_per_week': 40,
                'can_work_weekends': False,
                'preferred_days': [0, 1, 2, 3, 4],
                'unavailable_days': []
            }
        ],
        'employee_absences': [
            {
                'employee_id': 'emp-3',
                'start_date': '2026-02-10',
                'end_date': '2026-02-14',
                'absence_type': 'vacation'
            }
        ],
        'scheduling_rules': {
            'max_consecutive_days': 6,
            'min_daily_rest_hours': 11,
            'max_weekly_work_hours': 48
        },
        'trading_sundays': [
            {
                'date': '2026-02-15',
                'is_active': True
            }
        ],
        'solver_time_limit': 120
    }
    
    # Uruchom optymalizację
    result = generate_schedule_optimized(sample_input)
    
    # Wyświetl wynik
    print("\n" + "="*80)
    print("WYNIK:")
    print("="*80)
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
