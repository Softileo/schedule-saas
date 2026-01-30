"""
=============================================================================
IDEALNY ALGORYTM GRAFIKU - Google OR-Tools CP-SAT Solver
=============================================================================

Używa Constraint Programming do znalezienia OPTYMALNEGO rozwiązania.
OR-Tools to biblioteka Google używana przez miliony firm na świecie.

Optymalizuje:
1. ✅ Wyrównanie godzin między pracownikami
2. ✅ Wyrównanie weekendów
3. ✅ Zgodność z Kodeksem Pracy (hard constraints)
4. ✅ Minimalizacja naruszeń i kar
5. ✅ Maksymalizacja preferencji pracowników
"""

import logging
from typing import List, Dict, Set, Tuple, Optional, Union
from datetime import datetime, timedelta
from collections import defaultdict

from ortools.sat.python import cp_model
import numpy as np

from .types import (
    SchedulerInput,
    GeneratedShift,
    Employee,
    ShiftTemplate,
    POLISH_LABOR_CODE
)
from .utils import get_shift_time_type

logger = logging.getLogger(__name__)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_shift_type_group(start_time: str) -> str:
    """
    Grupuje zmiany o podobnych godzinach rozpoczęcia.
    Np. 5:00-13:00 i 6:00-14:00 to obie "poranne".
    
    Grupy:
    - 'early_morning': 4:00-7:00 (wczesnoporanne)
    - 'morning': 7:00-11:00 (poranne)
    - 'afternoon': 11:00-16:00 (popołudniowe)
    - 'evening': 16:00-20:00 (wieczorne)
    - 'night': 20:00-4:00 (nocne)
    """
    hour = int(start_time.split(':')[0])
    
    if 4 <= hour < 7:
        return 'early_morning'
    elif 7 <= hour < 11:
        return 'morning'
    elif 11 <= hour < 16:
        return 'afternoon'
    elif 16 <= hour < 20:
        return 'evening'
    else:  # 20-24 lub 0-4
        return 'night'

def get_day_name(date_str: str) -> str:
    """Zwraca nazwę dnia tygodnia w formacie 'mon', 'tue', etc."""
    date_obj = datetime.fromisoformat(date_str)
    day_names = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    return day_names[date_obj.weekday()]

# =============================================================================
# CP-SAT OPTIMIZER
# =============================================================================

class ORToolsScheduleOptimizer:
    """
    Idealny optymalizator grafiku używający Google OR-Tools CP-SAT Solver.
    
    Gwarantuje:
    - Zgodność z Kodeksem Pracy (hard constraints)
    - Optymalne wyrównanie obciążenia
    - Minimalne naruszenia preferencji
    """
    
    def __init__(self, input_data: SchedulerInput, config: dict = None):
        self.input = input_data
        self.config = config or {}
        
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Konfiguracja solvera
        self.solver.parameters.max_time_in_seconds = self.config.get('timeoutMs', 30000) / 1000
        self.solver.parameters.num_search_workers = 4  # Wielowątkowość
        self.solver.parameters.log_search_progress = True
        
        # Zmienne
        self.shifts = {}  # (emp_id, date, template_id) -> BoolVar
        self.hours_vars = {}  # emp_id -> IntVar (total hours)
        self.weekend_vars = {}  # emp_id -> IntVar (weekend shifts count)
        self.shift_type_vars = {}  # (emp_id, shift_type) -> IntVar (liczba zmian danego typu)
        
        # Dane
        self.work_days = self._get_work_days()
        self.employees_map = {emp.id: emp for emp in self.input.employees}
        self.templates_map = {tpl.id: tpl for tpl in self.input.templates}
        self.absence_dates = self._build_absence_map()
        self.vacation_hours = self._calculate_vacation_hours()  # Godziny urlopu per pracownik
        
        logger.info(f"🔧 Inicjalizacja OR-Tools Optimizer")
        logger.info(f"  Pracowników: {len(self.input.employees)}")
        logger.info(f"  Dni roboczych: {len(self.work_days)}")
        logger.info(f"  Szablonów: {len(self.input.templates)}")
        
        # Status rozwiązania
        self.solve_status = None
        self.solve_message = None
    
    def optimize(self) -> Union[List[GeneratedShift], dict]:
        """
        Główna metoda - tworzy i rozwiązuje model
        
        Returns:
            List[GeneratedShift] - lista zmian gdy sukces
            dict - słownik z błędem gdy nie można ułożyć grafiku
        """
        
        logger.info("🚀 Budowanie modelu CP-SAT...")
        
        # Sprawdź czy mamy wystarczającą liczbę pracowników
        infeasibility_check = self._check_feasibility()
        if infeasibility_check:
            return infeasibility_check
        
        # 1. Tworzenie zmiennych decyzyjnych
        self._create_decision_variables()
        
        # 2. Hard constraints (Kodeks Pracy)
        self._add_labor_code_constraints()
        
        # 3. Obsługa wymagań biznesowych
        self._add_business_constraints()
        
        # 4. Funkcja celu (soft constraints)
        self._add_objective_function()
        
        # 5. Rozwiązanie
        logger.info("🧠 Rozwiązywanie modelu CP-SAT...")
        status = self.solver.Solve(self.model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            logger.info(f"✅ Znaleziono rozwiązanie!")
            logger.info(f"  Status: {'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}")
            logger.info(f"  Czas: {self.solver.WallTime():.2f}s")
            logger.info(f"  Wartość celu: {self.solver.ObjectiveValue()}")
            
            shifts = self._extract_solution()
            # Post-processing: dopasuj godziny do dokładnego etatu
            return self._adjust_hours_to_target(shifts)
        else:
            # Nie znaleziono rozwiązania - sprawdź dlaczego
            logger.error(f"❌ Nie znaleziono rozwiązania! Status: {status}")
            
            error_msg = self._diagnose_infeasibility()
            self.solve_status = 'INFEASIBLE'
            self.solve_message = error_msg
            
            return {
                'error': True,
                'code': 'INFEASIBLE_SCHEDULE',
                'message': error_msg,
                'details': self._get_capacity_analysis()
            }
    
    def _check_feasibility(self) -> Optional[dict]:
        """
        Sprawdza podstawową wykonalność przed budowaniem modelu
        """
        # Oblicz wymaganą pojemność (suma min_employees * godziny * dni)
        total_required_hours = 0
        for template in self.input.templates:
            shift_hours = template.get_duration_hours()
            total_required_hours += template.min_employees * shift_hours * len(self.work_days)
        
        # Oblicz dostępną pojemność (suma dostępnych godzin pracowników)
        total_available_hours = 0
        for emp in self.input.employees:
            # Godziny miesięczne minus urlop
            available = emp.weekly_hours * 4 - self.vacation_hours.get(emp.id, 0)
            total_available_hours += max(0, available)
        
        logger.info(f"📊 Analiza pojemności:")
        logger.info(f"  Wymagane godziny: {total_required_hours:.0f}h")
        logger.info(f"  Dostępne godziny: {total_available_hours:.0f}h")
        
        if total_required_hours > total_available_hours * 1.1:  # 10% margines
            shortage = total_required_hours - total_available_hours
            return {
                'error': True,
                'code': 'INSUFFICIENT_CAPACITY',
                'message': f'Za mało pracowników! Brakuje ~{shortage:.0f}h. Zmniejsz wymagania na zmianach lub dodaj pracowników.',
                'details': {
                    'required_hours': round(total_required_hours),
                    'available_hours': round(total_available_hours),
                    'shortage': round(shortage)
                }
            }
        
        return None
    
    def _diagnose_infeasibility(self) -> str:
        """
        Diagnozuje przyczynę braku rozwiązania
        """
        messages = []
        
        # Sprawdź braki kadrowe na poszczególnych zmianach
        for template in self.input.templates:
            available_count = 0
            for date in self.work_days:
                available_for_day = sum(
                    1 for emp in self.input.employees
                    if date not in self.absence_dates.get(emp.id, set())
                )
                if available_for_day < template.min_employees:
                    available_count += 1
            
            if available_count > 0:
                messages.append(
                    f"Zmiana {template.start_time}-{template.end_time}: "
                    f"w {available_count} dniach brakuje pracowników (wymagane min. {template.min_employees})"
                )
        
        # Sprawdź czy ograniczenia 48h/tydzień są za ciasne
        weekly_capacity = sum(emp.weekly_hours for emp in self.input.employees)
        weekly_required = sum(
            t.min_employees * t.get_duration_hours() * 5  # ~5 dni roboczych/tydzień
            for t in self.input.templates
        )
        
        if weekly_required > weekly_capacity:
            messages.append(
                f"Tygodniowe zapotrzebowanie ({weekly_required:.0f}h) przekracza "
                f"dostępność pracowników ({weekly_capacity:.0f}h)"
            )
        
        if not messages:
            messages.append(
                "Nie można ułożyć grafiku spełniającego wszystkie wymagania. "
                "Sprawdź: 1) Liczbę pracowników na zmianach 2) Urlopy 3) Wymagania Kodeksu Pracy"
            )
        
        return "; ".join(messages)
    
    def _get_capacity_analysis(self) -> dict:
        """Zwraca szczegółową analizę pojemności"""
        analysis = {
            'employees': [],
            'shifts': [],
            'recommendations': []
        }
        
        # Analiza pracowników
        for emp in self.input.employees:
            vacation_h = self.vacation_hours.get(emp.id, 0)
            available_h = emp.weekly_hours * 4 - vacation_h
            absence_days = len(self.absence_dates.get(emp.id, set()))
            
            analysis['employees'].append({
                'name': emp.name,
                'weekly_hours': emp.weekly_hours,
                'vacation_days': absence_days,
                'available_hours': round(available_h, 1)
            })
        
        # Analiza zmian
        for template in self.input.templates:
            shift_hours = template.get_duration_hours()
            required_total = template.min_employees * len(self.work_days) * shift_hours
            
            analysis['shifts'].append({
                'time': f"{template.start_time}-{template.end_time}",
                'min_employees': template.min_employees,
                'hours_per_shift': shift_hours,
                'total_required_hours': round(required_total, 1)
            })
        
        # Rekomendacje
        total_required = sum(s['total_required_hours'] for s in analysis['shifts'])
        total_available = sum(e['available_hours'] for e in analysis['employees'])
        
        if total_required > total_available:
            analysis['recommendations'].append(
                f"Dodaj pracowników lub zmniejsz min_employees na zmianach"
            )
        
        return analysis
    
    def _get_work_days(self) -> List[str]:
        """Zwraca posortowaną listę dni roboczych"""
        all_days = set()
        all_days.update(self.input.work_days)
        all_days.update(self.input.saturday_days)
        all_days.update(self.input.trading_sundays)
        
        # Usuń święta
        holidays_set = {h.date for h in self.input.holidays}
        all_days -= holidays_set
        
        return sorted(list(all_days))
    
    def _build_absence_map(self) -> Dict[str, Set[str]]:
        """Buduje mapę nieobecności: emp_id -> set of dates"""
        absence_map = defaultdict(set)
        
        for emp in self.input.employees:
            for absence in emp.absences:
                start = datetime.fromisoformat(absence.start_date)
                end = datetime.fromisoformat(absence.end_date)
                current = start
                while current <= end:
                    absence_map[emp.id].add(current.strftime('%Y-%m-%d'))
                    current += timedelta(days=1)
        
        return absence_map
    
    def _calculate_vacation_hours(self) -> Dict[str, float]:
        """
        Oblicza godziny urlopu dla każdego pracownika.
        
        Urlop obliczany na podstawie typowej długości zmiany:
        - Jeśli pracownik pracuje 12h zmiany → 1 dzień urlopu = 12h
        - Jeśli pracownik pracuje 8h zmiany → 1 dzień urlopu = 8h
        """
        vacation_hours = {}
        
        # Oblicz średnią długość zmiany dla całej organizacji
        if self.input.templates:
            avg_shift_hours = sum(t.get_duration_hours() for t in self.input.templates) / len(self.input.templates)
        else:
            avg_shift_hours = 8.0
        
        for emp in self.input.employees:
            # Policz dni urlopowe w tym miesiącu
            vacation_days = len(self.absence_dates.get(emp.id, set()))
            
            # Oblicz godziny urlopu: dni × średnia długość zmiany
            vacation_hours[emp.id] = vacation_days * avg_shift_hours
            
            if vacation_days > 0:
                logger.info(f"  🏖️ {emp.name}: {vacation_days} dni urlopu = {vacation_hours[emp.id]:.1f}h")
        
        return vacation_hours
    
    def _create_decision_variables(self):
        """Tworzy zmienne decyzyjne: czy pracownik X pracuje zmianę Y w dniu Z"""
        
        logger.info("📊 Tworzenie zmiennych decyzyjnych...")
        
        # Dla każdego dnia, każdego szablonu i każdego pracownika
        for date in self.work_days:
            for template in self.input.templates:
                for employee in self.input.employees:
                    # Zmienna binarna: czy pracownik pracuje tę zmianę
                    var_name = f"shift_{employee.id}_{date}_{template.id}"
                    self.shifts[(employee.id, date, template.id)] = self.model.NewBoolVar(var_name)
        
        # Zmienne pomocnicze dla godzin i weekendów
        for employee in self.input.employees:
            # Suma godzin pracownika (0-200)
            self.hours_vars[employee.id] = self.model.NewIntVar(
                0, 200, f"total_hours_{employee.id}"
            )
            
            # Liczba zmian weekendowych (0-20)
            self.weekend_vars[employee.id] = self.model.NewIntVar(
                0, 20, f"weekend_shifts_{employee.id}"
            )
        
        logger.info(f"  Utworzono {len(self.shifts)} zmiennych zmian")
    
    def _add_labor_code_constraints(self):
        """Dodaje HARD CONSTRAINTS z Kodeksu Pracy (Art. 129, 132, 133) i reguł biznesowych"""
        
        logger.info("⚖️ Dodawanie Constraintów Kodeksu Pracy i reguł biznesowych...")
        
        # =================================================================
        # HARD CONSTRAINT: ZMIANY TYLKO W DOZWOLONE DNI (days_of_week)
        # =================================================================
        # Jeśli szablon ma np. days_of_week=['sun'] to zmiana może być tylko w niedziele
        for date in self.work_days:
            day_name = get_day_name(date)  # 'mon', 'tue', ..., 'sun'
            
            for template in self.input.templates:
                # Sprawdź czy ten dzień jest dozwolony dla tego szablonu
                if template.days_of_week and day_name not in template.days_of_week:
                    # Zabroń wszystkim pracownikom tej zmiany w tym dniu
                    for employee in self.input.employees:
                        self.model.Add(self.shifts[(employee.id, date, template.id)] == 0)
        
        logger.info("  ✅ Constrainty days_of_week dodane")
        
        # =================================================================
        # HARD CONSTRAINT: TEMPLATE ASSIGNMENTS (przypisania pracowników)
        # =================================================================
        # Jeśli pracownik ma template_assignments, może pracować TYLKO te zmiany
        for employee in self.input.employees:
            emp_id = employee.id
            
            # Jeśli pracownik ma przypisane szablony, może tylko te
            if employee.template_assignments and len(employee.template_assignments) > 0:
                allowed_templates = set(employee.template_assignments)
                
                for date in self.work_days:
                    for template in self.input.templates:
                        if template.id not in allowed_templates:
                            # Zabroń tej zmiany - pracownik nie jest do niej przypisany
                            self.model.Add(self.shifts[(emp_id, date, template.id)] == 0)
                
                logger.info(f"  📋 {employee.name}: przypisany do {len(allowed_templates)} szablonów")
        
        logger.info("  ✅ Constrainty template_assignments dodane")
        
        # =================================================================
        # POZOSTAŁE CONSTRAINTY KODEKSU PRACY
        # =================================================================
        for employee in self.input.employees:
            emp_id = employee.id
            
            # 1. NIEOBECNOŚCI - pracownik nie może pracować w czasie urlopu
            for date in self.work_days:
                if date in self.absence_dates.get(emp_id, set()):
                    for template in self.input.templates:
                        self.model.Add(self.shifts[(emp_id, date, template.id)] == 0)
            
            # 2. JEDNA ZMIANA NA DZIEŃ - pracownik może mieć max 1 zmianę dziennie
            for date in self.work_days:
                shifts_this_day = [
                    self.shifts[(emp_id, date, tpl.id)]
                    for tpl in self.input.templates
                ]
                self.model.Add(sum(shifts_this_day) <= 1)
            
            # 2b. ODPOCZYNEK DOBOWY 11H (Art. 132) - HARD CONSTRAINT
            # Jeśli pracownik kończy zmianę późno (po 15:00), nie może zaczynać wcześnie następnego dnia
            # Parsujemy szablony i sprawdzamy przejścia między dniami
            for i in range(len(self.work_days) - 1):
                day1 = self.work_days[i]
                day2 = self.work_days[i + 1]
                
                # Sprawdź czy day2 jest następny dzień (nie ma gap - np. weekend)
                day1_obj = datetime.fromisoformat(day1)
                day2_obj = datetime.fromisoformat(day2)
                if (day2_obj - day1_obj).days != 1:
                    continue  # Pomijamy jeśli nie są kolejne dni
                
                for tpl1 in self.input.templates:
                    end_hour1 = int(tpl1.end_time.split(':')[0])
                    end_min1 = int(tpl1.end_time.split(':')[1])
                    
                    for tpl2 in self.input.templates:
                        start_hour2 = int(tpl2.start_time.split(':')[0])
                        start_min2 = int(tpl2.start_time.split(':')[1])
                        
                        # Oblicz odpoczynek: od końca zmiany 1 do początku zmiany 2
                        # Czas odpoczynku = 24 - end_hour1 + start_hour2 (w przybliżeniu)
                        rest_hours = (24 - end_hour1 - end_min1/60) + (start_hour2 + start_min2/60)
                        
                        # Jeśli odpoczynek < 11h, te dwie zmiany nie mogą być obok siebie
                        if rest_hours < 11:
                            # Constraint: NIE MOŻNA mieć obu zmian
                            # shift1 + shift2 <= 1
                            self.model.Add(
                                self.shifts[(emp_id, day1, tpl1.id)] + 
                                self.shifts[(emp_id, day2, tpl2.id)] <= 1
                            )
            
            # 3. MAX 6 KOLEJNYCH DNI PRACY (Art. 133)
            dates_list = self.work_days
            for i in range(len(dates_list) - 6):
                consecutive_days = dates_list[i:i+7]  # 7 dni
                shifts_in_window = []
                for date in consecutive_days:
                    for tpl in self.input.templates:
                        shifts_in_window.append(self.shifts[(emp_id, date, tpl.id)])
                
                # Max 6 dni pracy w oknie 7 dni
                self.model.Add(sum(shifts_in_window) <= 6)
            
            # 4. ODPOCZYNEK TYGODNIOWY - min 1 dzień wolny w tygodniu
            # Podziel miesiąc na tygodnie
            week_starts = []
            current_date = datetime.fromisoformat(dates_list[0])
            end_date = datetime.fromisoformat(dates_list[-1])
            
            while current_date <= end_date:
                week_start = current_date - timedelta(days=current_date.weekday())
                if week_start.strftime('%Y-%m-%d') not in [w.strftime('%Y-%m-%d') for w in week_starts]:
                    week_starts.append(week_start)
                current_date += timedelta(days=7)
            
            for week_start in week_starts:
                week_dates = [
                    (week_start + timedelta(days=d)).strftime('%Y-%m-%d')
                    for d in range(7)
                    if (week_start + timedelta(days=d)).strftime('%Y-%m-%d') in self.work_days
                ]
                
                if week_dates:
                    shifts_this_week = []
                    for date in week_dates:
                        for tpl in self.input.templates:
                            shifts_this_week.append(self.shifts[(emp_id, date, tpl.id)])
                    
                    # Max 6 dni w tygodniu (minimum 1 dzień wolny)
                    self.model.Add(sum(shifts_this_week) <= 6)
            
            # 5. SUMA GODZIN - oblicz total_hours
            hours_expr = []
            for date in self.work_days:
                for template in self.input.templates:
                    hours_expr.append(
                        self.shifts[(emp_id, date, template.id)] * int(template.get_duration_hours())
                    )
            
            self.model.Add(self.hours_vars[emp_id] == sum(hours_expr))
            
            # 6. MAX 48H NA TYDZIEŃ (Art. 131 § 1) - HARD CONSTRAINT
            # Podziel miesiąc na tygodnie ISO
            weeks_hours = defaultdict(list)
            for date in self.work_days:
                if date not in self.absence_dates.get(emp_id, set()):
                    date_obj = datetime.fromisoformat(date)
                    week_num = date_obj.isocalendar()[1]
                    for template in self.input.templates:
                        hours = int(template.get_duration_hours())
                        weeks_hours[week_num].append(
                            self.shifts[(emp_id, date, template.id)] * hours
                        )
            
            for week_num, hours_list in weeks_hours.items():
                if hours_list:
                    # Max 48h w każdym tygodniu (Art. 131 § 1 KP)
                    self.model.Add(sum(hours_list) <= 48)
            
            # 7. WEEKENDY - oblicz weekend_shifts
            weekend_expr = []
            for date in self.work_days:
                date_obj = datetime.fromisoformat(date)
                if date_obj.weekday() >= 5:  # Sobota lub niedziela
                    for template in self.input.templates:
                        weekend_expr.append(self.shifts[(emp_id, date, template.id)])
            
            if weekend_expr:
                self.model.Add(self.weekend_vars[emp_id] == sum(weekend_expr))
        
        logger.info("  ✅ Constrainty Kodeksu Pracy dodane (w tym 48h/tydzień)")
    
    def _add_business_constraints(self):
        """Dodaje wymagania biznesowe (pokrycie zmian)"""
        
        logger.info("💼 Dodawanie wymagań biznesowych...")
        
        # Każdy dzień musi mieć wymaganą liczbę pracowników na każdym szablonie
        for date in self.work_days:
            for template in self.input.templates:
                min_needed = template.min_employees
                # max_employees = 0 lub None oznacza brak limitu
                max_allowed = template.max_employees if template.max_employees and template.max_employees > 0 else None
                
                # Suma pracowników na tej zmianie
                employees_on_shift = [
                    self.shifts[(emp.id, date, template.id)]
                    for emp in self.input.employees
                    if date not in self.absence_dates.get(emp.id, set())
                ]
                
                if employees_on_shift:
                    # Minimum wymaganych pracowników
                    self.model.Add(sum(employees_on_shift) >= min_needed)
                    # Maximum dozwolonych pracowników (tylko jeśli jest limit)
                    if max_allowed is not None:
                        self.model.Add(sum(employees_on_shift) <= max_allowed)
        
        logger.info("  ✅ Wymagania biznesowe dodane")
    
    def _add_objective_function(self):
        """
        Funkcja celu - maksymalizuj jakość grafiku:
        1. Minimalizacja odchyleń od etatu (NAJWAŻNIEJSZE - każdy ma mieć 160h)
        2. Wyrównanie godzin między pracownikami
        3. Wyrównanie weekendów
        """
        
        logger.info("🎯 Budowanie funkcji celu...")
        
        objective_terms = []
        
        # Oblicz liczbę tygodni w miesiącu (standardowo 4 dla pełnego miesiąca)
        # Nie dzielimy przez work_days bo to daje za dużo (24/5=4.8)
        # Standardowa norma: 4 tygodnie/miesiąc (dla 28-31 dni)
        weeks_in_month = 4.0  # Standardowa norma miesięczna
        
        # 1. OSIĄGNIĘCIE ETATU - każdy pracownik MUSI mieć swoje godziny (NAJWYŻSZA WAGA)
        for employee in self.input.employees:
            # Oblicz docelowe godziny miesięczne
            # Dla full-time: 40h/tydzień * 4 tygodnie = 160h
            base_target = int(employee.weekly_hours * weeks_in_month)
            
            # Odejmij godziny urlopu (urlop zmniejsza wymagany czas pracy)
            vacation_hours = self.vacation_hours.get(employee.id, 0)
            target_hours = max(0, base_target - int(vacation_hours))
            
            logger.info(f"  📌 {employee.name}: cel = {target_hours}h (baza: {base_target}h - urlop: {int(vacation_hours)}h)")
            
            emp_hours = self.hours_vars[employee.id]
            
            # Zmienna dla niedomiaru godzin (ile brakuje do etatu)
            underage = self.model.NewIntVar(0, 300, f"underage_{employee.id}")
            self.model.Add(underage >= target_hours - emp_hours)
            self.model.Add(underage >= 0)
            
            # Zmienna dla nadmiaru (ile ponad etat)
            overage = self.model.NewIntVar(0, 300, f"overage_{employee.id}")
            self.model.Add(overage >= emp_hours - target_hours)
            self.model.Add(overage >= 0)
            
            # BARDZO WYSOKA kara za niedobiór godzin (pracownik nie ma pełnego etatu)
            objective_terms.append(underage * -200)
            
            # BARDZO WYSOKA kara też za nadmiar (lepiej mieć dokładnie tyle ile trzeba)
            objective_terms.append(overage * -200)
        
        # 2. WYRÓWNANIE GODZIN - minimalizuj różnice między pracownikami
        all_hours = list(self.hours_vars.values())
        if len(all_hours) > 1:
            min_hours = self.model.NewIntVar(0, 200, "min_hours")
            max_hours = self.model.NewIntVar(0, 200, "max_hours")
            
            self.model.AddMinEquality(min_hours, all_hours)
            self.model.AddMaxEquality(max_hours, all_hours)
            
            # Minimalizuj różnicę (max - min)
            hours_diff = self.model.NewIntVar(-200, 200, "hours_diff")
            self.model.Add(hours_diff == max_hours - min_hours)
            objective_terms.append(hours_diff * -50)  # Kara za różnicę
        
        # 3. WYRÓWNANIE WEEKENDÓW
        all_weekends = list(self.weekend_vars.values())
        if len(all_weekends) > 1:
            min_weekends = self.model.NewIntVar(0, 20, "min_weekends")
            max_weekends = self.model.NewIntVar(0, 20, "max_weekends")
            
            self.model.AddMinEquality(min_weekends, all_weekends)
            self.model.AddMaxEquality(max_weekends, all_weekends)
            
            weekends_diff = self.model.NewIntVar(-20, 20, "weekends_diff")
            self.model.Add(weekends_diff == max_weekends - min_weekends)
            objective_terms.append(weekends_diff * -30)  # Kara za nierównomierność weekendów
        
        # 4. BONUS ZA KOMPLETNOŚĆ - im więcej godzin łącznie, tym lepiej (ale w rozsądnych granicach)
        total_hours_all = sum(self.hours_vars.values())
        objective_terms.append(total_hours_all * 1)  # Mały bonus
        
        # 5. RÓWNA LICZBA PRACOWNIKÓW NA ZMIANACH (WYSOKI PRIORYTET)
        # Dla każdego szablonu minimalizuj różnicę w liczbie pracowników między dniami
        for template in self.input.templates:
            # Zbierz zmienne dla liczby pracowników na tej zmianie w każdym dniu
            employees_per_day = []
            for date in self.work_days:
                emp_on_shift = sum(
                    self.shifts[(emp.id, date, template.id)]
                    for emp in self.input.employees
                    if date not in self.absence_dates.get(emp.id, set())
                )
                employees_per_day.append(emp_on_shift)
            
            if len(employees_per_day) > 1:
                # Utwórz zmienne dla min/max pracowników na tej zmianie
                shift_min = self.model.NewIntVar(0, len(self.input.employees), f"shift_min_{template.id}")
                shift_max = self.model.NewIntVar(0, len(self.input.employees), f"shift_max_{template.id}")
                
                self.model.AddMinEquality(shift_min, employees_per_day)
                self.model.AddMaxEquality(shift_max, employees_per_day)
                
                # Różnica między max a min (chcemy żeby była 0 = identyczna obsada każdego dnia)
                shift_diff = self.model.NewIntVar(-len(self.input.employees), len(self.input.employees), f"shift_diff_{template.id}")
                self.model.Add(shift_diff == shift_max - shift_min)
                
                # WYSOKA KARA za nierówną obsadę zmian (-100 = wyższy priorytet niż sprawiedliwe zmiany)
                objective_terms.append(shift_diff * -100)
        
        logger.info("  ✅ Dodano priorytet równomiernej obsady zmian")
        
        # Maksymalizuj funkcję celu
        self.model.Maximize(sum(objective_terms))
        
        logger.info("  ✅ Funkcja celu zbudowana")
    
    def _extract_solution(self) -> List[GeneratedShift]:
        """Wyciąga rozwiązanie z modelu"""
        
        logger.info("📋 Ekstrakcja rozwiązania...")
        
        shifts_result = []
        
        for (emp_id, date, template_id), var in self.shifts.items():
            if self.solver.Value(var) == 1:  # Zmiana przypisana
                employee = self.employees_map[emp_id]
                template = self.templates_map[template_id]
                
                shift = GeneratedShift(
                    employee_id=emp_id,
                    date=date,
                    start_time=template.start_time,
                    end_time=template.end_time,
                    break_minutes=template.break_minutes,
                    template_id=template_id
                )
                shifts_result.append(shift)
        
        # Sortuj po dacie
        shifts_result.sort(key=lambda s: (s.date, s.start_time, s.employee_id))
        
        # POST-PROCESSING: Dopasuj dokładnie godziny do etatu
        shifts_result = self._adjust_hours_to_target(shifts_result)
        
        # Statystyki
        logger.info(f"📊 Statystyki rozwiązania:")
        logger.info(f"  Wygenerowano zmian: {len(shifts_result)}")
        
        for emp_id, hours_var in self.hours_vars.items():
            hours = self.solver.Value(hours_var)
            weekends = self.solver.Value(self.weekend_vars[emp_id])
            emp_name = self.employees_map[emp_id].name
            logger.info(f"  {emp_name}: {hours}h, weekendy: {weekends}")
        
        return shifts_result
    
    def _get_next_shift_start(self, shifts: List[GeneratedShift], current_shift: GeneratedShift) -> Optional[datetime]:
        """Znajduje początek następnej zmiany dla tego pracownika"""
        current_date = datetime.fromisoformat(current_shift.date)
        
        for shift in shifts:
            if shift.employee_id != current_shift.employee_id:
                continue
            shift_date = datetime.fromisoformat(shift.date)
            if shift_date > current_date:
                start_time = datetime.strptime(f"{shift.date} {shift.start_time}", '%Y-%m-%d %H:%M')
                return start_time
        return None
    
    def _calculate_rest_hours(self, end_time: str, end_date: str, next_start: datetime) -> float:
        """Oblicza godziny odpoczynku między zmianami"""
        current_end = datetime.strptime(f"{end_date} {end_time}", '%Y-%m-%d %H:%M')
        return (next_start - current_end).total_seconds() / 3600
    
    def _adjust_hours_to_target(self, shifts: List[GeneratedShift]) -> List[GeneratedShift]:
        """
        Post-processing: Dopasowuje godziny do dokładnego etatu (±0.5h tolerancja)
        
        WAŻNE: Sprawdza 11h odpoczynek przed każdą modyfikacją!
        - Nie wydłuża zmiany jeśli naruszy to 11h odpoczynek do następnej
        - Nie skraca zmiany jeśli naruszy to 11h odpoczynek od poprzedniej
        """
        logger.info("⚙️ Dopasowywanie godzin do etatu (post-processing z walidacją 11h)...")
        
        # Grupuj zmiany po pracownikach
        shifts_by_employee = {}
        for shift in shifts:
            if shift.employee_id not in shifts_by_employee:
                shifts_by_employee[shift.employee_id] = []
            shifts_by_employee[shift.employee_id].append(shift)
        
        adjusted_shifts = []
        
        for emp_id, emp_shifts in shifts_by_employee.items():
            employee = self.employees_map.get(emp_id)
            if not employee:
                adjusted_shifts.extend(emp_shifts)
                continue
            
            # Oblicz docelowe godziny - 4 tygodnie standardowa norma minus urlop
            base_target = employee.weekly_hours * 4.0
            vacation_hours = self.vacation_hours.get(emp_id, 0)
            target_hours = max(0, base_target - vacation_hours)
            
            # Oblicz aktualne godziny
            current_hours = sum(s.get_duration_hours() for s in emp_shifts)
            
            # Różnica (+ = nadmiar, - = niedobiór)
            diff = current_hours - target_hours
            
            logger.info(f"  {employee.name}: {current_hours:.1f}h / {target_hours:.1f}h (diff: {diff:+.1f}h)")
            
            # Tolerancja ±0.5h - jeśli mieścimy się w tolerancji, nie modyfikuj
            if abs(diff) <= 0.5:
                adjusted_shifts.extend(emp_shifts)
                continue
            
            # Sortuj zmiany po dacie
            emp_shifts_sorted = sorted(emp_shifts, key=lambda s: s.date)
            
            remaining_diff = diff
            shifts_to_keep = []
            removed_shifts = set()
            
            # KROK 1: Jeśli za dużo godzin - najpierw usuń całe zmiany (gdy diff > 5h)
            # Usuwaj od końca miesiąca
            for shift in reversed(emp_shifts_sorted):
                shift_hours = shift.get_duration_hours()
                
                if remaining_diff > 5 and remaining_diff >= shift_hours:
                    # Usuń całą zmianę
                    remaining_diff -= shift_hours
                    removed_shifts.add(shift.date)
                    logger.info(f"    Usunięto zmianę {shift.date}: -{shift_hours:.1f}h")
            
            for shift in emp_shifts_sorted:
                if shift.date not in removed_shifts:
                    shifts_to_keep.append(shift)
            
            # KROK 2: Skracaj/wydłużaj pozostałe zmiany (max 2h na zmianę)
            # WAŻNE: Sprawdzaj 11h odpoczynek!
            for i, shift in enumerate(shifts_to_keep):
                if abs(remaining_diff) <= 0.5:
                    break
                
                # Znajdź następną zmianę dla sprawdzenia 11h
                next_start = None
                if i < len(shifts_to_keep) - 1:
                    next_shift = shifts_to_keep[i + 1]
                    next_start = datetime.strptime(f"{next_shift.date} {next_shift.start_time}", '%Y-%m-%d %H:%M')
                
                # Parsuj czas końca
                end_parts = shift.end_time.split(':')
                end_hour = int(end_parts[0])
                end_min = int(end_parts[1])
                
                if remaining_diff > 0:
                    # ZA DUŻO godzin - skróć zmianę (max 2h)
                    reduction = min(remaining_diff, 2.0)
                    
                    # Skróć koniec zmiany
                    new_end_min = end_min - int(reduction * 60)
                    new_end_hour = end_hour
                    
                    while new_end_min < 0:
                        new_end_min += 60
                        new_end_hour -= 1
                    
                    # Sprawdź minimalny czas zmiany (min 4h)
                    start_parts = shift.start_time.split(':')
                    start_hour = int(start_parts[0])
                    new_duration = (new_end_hour - start_hour) + (new_end_min - int(start_parts[1])) / 60
                    
                    if new_duration < 4:
                        logger.info(f"    Pominięto {shift.date}: skrócenie dałoby za krótką zmianę")
                        continue
                    
                    shift.end_time = f"{new_end_hour:02d}:{new_end_min:02d}"
                    remaining_diff -= reduction
                    logger.info(f"    Skrócono {shift.date}: -{reduction:.1f}h")
                    
                elif remaining_diff < 0:
                    # ZA MAŁO godzin - wydłuż zmianę (max 2h)
                    extension = min(abs(remaining_diff), 2.0)
                    
                    # Oblicz nowy czas końca
                    new_end_min = end_min + int(extension * 60)
                    new_end_hour = end_hour
                    
                    while new_end_min >= 60:
                        new_end_min -= 60
                        new_end_hour += 1
                    
                    # Limit do 23:00 (żeby była możliwość 11h odpoczynku do 08:00)
                    if new_end_hour >= 23:
                        new_end_hour = 22
                        new_end_min = 0
                    
                    # SPRAWDŹ 11H ODPOCZYNEK przed wydłużeniem
                    if next_start:
                        new_end_time = f"{new_end_hour:02d}:{new_end_min:02d}"
                        rest_hours = self._calculate_rest_hours(new_end_time, shift.date, next_start)
                        
                        if rest_hours < 11:
                            # Oblicz maksymalne wydłużenie zachowujące 11h
                            current_end = datetime.strptime(f"{shift.date} {shift.end_time}", '%Y-%m-%d %H:%M')
                            max_extension_hours = (next_start - current_end).total_seconds() / 3600 - 11
                            
                            if max_extension_hours <= 0:
                                logger.info(f"    Pominięto {shift.date}: wydłużenie naruszyłoby 11h odpoczynek")
                                continue
                            
                            extension = min(extension, max_extension_hours)
                            new_end_min = end_min + int(extension * 60)
                            new_end_hour = end_hour
                            
                            while new_end_min >= 60:
                                new_end_min -= 60
                                new_end_hour += 1
                    
                    if extension > 0.1:  # Minimalna zmiana 6 minut
                        shift.end_time = f"{new_end_hour:02d}:{new_end_min:02d}"
                        remaining_diff += extension
                        logger.info(f"    Wydłużono {shift.date}: +{extension:.1f}h (z zachowaniem 11h odpoczynku)")
            
            adjusted_shifts.extend(shifts_to_keep)
        
        # Sortuj ponownie
        adjusted_shifts.sort(key=lambda s: (s.date, s.start_time, s.employee_id))
        
        logger.info("  ✅ Dopasowanie godzin zakończone")
        return adjusted_shifts
