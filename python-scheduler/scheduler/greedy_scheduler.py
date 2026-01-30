"""
=============================================================================
GREEDY SCHEDULER - Algorytm zachłanny do generowania grafików
=============================================================================

Szybka implementacja algorytmu zachłannego:
1. Sortuje dni robocze po priorytetach
2. Dla każdego dnia przypisuje szablony zmian
3. Wybiera pracowników z najmniejszą liczbą godzin
4. Sprawdza zgodność z Kodeksem Pracy
"""

import logging
from typing import List, Dict, Set
from datetime import datetime, timedelta
from collections import defaultdict
import random

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
# GREEDY SCHEDULER
# =============================================================================

class GreedyScheduler:
    """Algorytm zachłanny do szybkiego generowania grafików"""
    
    def __init__(self, input_data: SchedulerInput):
        self.input = input_data
        self.shifts: List[GeneratedShift] = []
        self.employee_hours: Dict[str, float] = defaultdict(float)
        self.employee_shifts: Dict[str, List[GeneratedShift]] = defaultdict(list)
        self.employee_absences: Dict[str, Set[str]] = {}
        
        # Inicjalizacja map nieobecności
        for emp in self.input.employees:
            absence_dates = set()
            for absence in emp.absences:
                start = datetime.fromisoformat(absence.start_date)
                end = datetime.fromisoformat(absence.end_date)
                current = start
                while current <= end:
                    absence_dates.add(current.strftime('%Y-%m-%d'))
                    current += timedelta(days=1)
            self.employee_absences[emp.id] = absence_dates
    
    def generate(self) -> List[GeneratedShift]:
        """Główna funkcja generująca grafik"""
        logger.info(f"🚀 Starting Greedy Scheduler for {self.input.year}-{self.input.month:02d}")
        logger.info(f"  Employees: {len(self.input.employees)}")
        logger.info(f"  Templates: {len(self.input.templates)}")
        
        # Zbierz wszystkie dni robocze
        work_days = self._get_work_days()
        logger.info(f"  Work days: {len(work_days)}")
        
        # Generuj zmiany dla każdego dnia
        for date_str in work_days:
            self._generate_shifts_for_day(date_str)
        
        # Uzupełnij godziny jeśli potrzeba
        self._fill_missing_hours()
        
        logger.info(f"✅ Generated {len(self.shifts)} shifts")
        return self.shifts
    
    def _get_work_days(self) -> List[str]:
        """Zwraca posortowaną listę dni roboczych"""
        all_days = set()
        
        # Dodaj dni robocze
        all_days.update(self.input.work_days)
        all_days.update(self.input.saturday_days)
        all_days.update(self.input.trading_sundays)
        
        # Usuń święta
        holidays_set = {h.date for h in self.input.holidays}
        all_days -= holidays_set
        
        return sorted(list(all_days))
    
    def _generate_shifts_for_day(self, date_str: str):
        """Generuje zmiany dla pojedynczego dnia"""
        date_obj = datetime.fromisoformat(date_str)
        is_weekend = date_obj.weekday() >= 5
        
        # Dla każdego szablonu zmian
        for template in self.input.templates:
            needed = template.min_employees
            
            # Znajdź odpowiednią liczbę pracowników
            selected = self._select_employees_for_shift(
                date_str,
                template,
                needed,
                is_weekend
            )
            
            # Utwórz zmiany
            for emp in selected:
                shift = self._create_shift(emp, template, date_str)
                self.shifts.append(shift)
                self.employee_hours[emp.id] += template.get_duration_hours()
                self.employee_shifts[emp.id].append(shift)
    
    def _select_employees_for_shift(
        self,
        date_str: str,
        template: ShiftTemplate,
        needed: int,
        is_weekend: bool
    ) -> List[Employee]:
        """Wybiera pracowników do zmiany (algorytm zachłanny)"""
        available = []
        
        for emp in self.input.employees:
            # Sprawdź czy pracownik jest dostępny
            if not self._is_employee_available(emp, date_str, template):
                continue
            
            # Oblicz score (priorytet)
            score = self._calculate_employee_score(emp, date_str, is_weekend)
            available.append((emp, score))
        
        # Sortuj po score (malejąco = najwyższy priorytet)
        available.sort(key=lambda x: x[1], reverse=True)
        
        # Wybierz top N
        return [emp for emp, _ in available[:needed]]
    
    def _is_employee_available(
        self,
        emp: Employee,
        date_str: str,
        template: ShiftTemplate
    ) -> bool:
        """Sprawdza czy pracownik może być przypisany do zmiany"""
        
        # Sprawdź nieobecność
        if date_str in self.employee_absences.get(emp.id, set()):
            return False
        
        # Sprawdź czy nie przekroczy tygodniowego limitu
        weekly_hours = self._get_weekly_hours(emp.id, date_str)
        if weekly_hours + template.get_duration_hours() > POLISH_LABOR_CODE.MAX_HOURS_WITH_OVERTIME:
            return False
        
        # Sprawdź odpoczynek dobowy (11h)
        if not self._check_daily_rest(emp.id, date_str, template):
            return False
        
        # Sprawdź maksymalną liczbę kolejnych dni (6)
        if not self._check_consecutive_days(emp.id, date_str):
            return False
        
        return True
    
    def _calculate_employee_score(
        self,
        emp: Employee,
        date_str: str,
        is_weekend: bool
    ) -> float:
        """Oblicza priorytet pracownika (wyższy = lepszy)"""
        score = 0.0
        
        # 1. Pracownicy z mniejszą liczbą godzin mają wyższy priorytet
        target_hours = emp.weekly_hours * 4.33  # ~miesiąc
        current_hours = self.employee_hours.get(emp.id, 0.0)
        hours_diff = target_hours - current_hours
        score += hours_diff * 2.0  # waga: 2.0
        
        # 2. Wyrównywanie weekendów
        weekend_count = self._count_weekend_shifts(emp.id)
        if is_weekend:
            score -= weekend_count * 5.0  # kara za dużo weekendów
        
        # 3. Maksymalizuj ciągłość (lepiej dłuższe serie)
        consecutive = self._count_consecutive_days(emp.id, date_str)
        if 1 <= consecutive <= 4:
            score += 3.0  # bonus za ciągłość
        
        # 4. Losowy szum dla różnorodności
        score += random.uniform(-1.0, 1.0)
        
        return score
    
    def _create_shift(
        self,
        emp: Employee,
        template: ShiftTemplate,
        date_str: str
    ) -> GeneratedShift:
        """Tworzy obiekt zmiany"""
        return GeneratedShift(
            employee_id=emp.id,
            date=date_str,
            start_time=template.start_time,
            end_time=template.end_time,
            break_minutes=template.break_minutes,
            template_id=template.id
        )
    
    def _get_weekly_hours(self, emp_id: str, date_str: str) -> float:
        """Oblicza godziny pracownika w bieżącym tygodniu"""
        date_obj = datetime.fromisoformat(date_str)
        week_start = date_obj - timedelta(days=date_obj.weekday())
        week_end = week_start + timedelta(days=6)
        
        hours = 0.0
        for shift in self.employee_shifts.get(emp_id, []):
            shift_date = datetime.fromisoformat(shift.date)
            if week_start <= shift_date <= week_end:
                hours += shift.get_duration_hours()
        
        return hours
    
    def _check_daily_rest(
        self,
        emp_id: str,
        date_str: str,
        template: ShiftTemplate
    ) -> bool:
        """Sprawdza 11h odpoczynek dobowy (Art. 132)"""
        date_obj = datetime.fromisoformat(date_str)
        prev_day = (date_obj - timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Znajdź ostatnią zmianę z poprzedniego dnia
        prev_shifts = [
            s for s in self.employee_shifts.get(emp_id, [])
            if s.date == prev_day
        ]
        
        if not prev_shifts:
            return True
        
        # Znajdź najpóźniejszy koniec zmiany z wczoraj
        last_shift = max(prev_shifts, key=lambda s: s.end_time)
        
        # Parsuj czasy
        last_end = datetime.strptime(last_shift.end_time, '%H:%M')
        current_start = datetime.strptime(template.start_time, '%H:%M')
        
        # Jeśli start jest wcześniej niż koniec (przejście przez północ)
        if current_start < last_end:
            current_start += timedelta(days=1)
        
        rest_hours = (current_start - last_end).total_seconds() / 3600
        
        return rest_hours >= POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS
    
    def _check_consecutive_days(self, emp_id: str, date_str: str) -> bool:
        """Sprawdza czy nie przekroczono 6 kolejnych dni pracy (Art. 133)"""
        consecutive = self._count_consecutive_days(emp_id, date_str)
        return consecutive < POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS
    
    def _count_consecutive_days(self, emp_id: str, date_str: str) -> int:
        """Liczy kolejne dni pracy przed daną datą"""
        date_obj = datetime.fromisoformat(date_str)
        count = 0
        
        for i in range(1, 8):  # Sprawdź max 7 dni wstecz
            check_date = (date_obj - timedelta(days=i)).strftime('%Y-%m-%d')
            has_shift = any(
                s.date == check_date
                for s in self.employee_shifts.get(emp_id, [])
            )
            if has_shift:
                count += 1
            else:
                break
        
        return count
    
    def _count_weekend_shifts(self, emp_id: str) -> int:
        """Liczy zmiany weekendowe pracownika"""
        count = 0
        for shift in self.employee_shifts.get(emp_id, []):
            date_obj = datetime.fromisoformat(shift.date)
            if date_obj.weekday() >= 5:  # Sobota lub niedziela
                count += 1
        return count
    
    def _fill_missing_hours(self):
        """Uzupełnia godziny pracowników do etatu"""
        logger.info("📊 Filling missing hours...")
        
        # Znajdź pracowników z niedoborem godzin
        employees_to_fill = []
        for emp in self.input.employees:
            target = emp.weekly_hours * 4.33
            current = self.employee_hours.get(emp.id, 0.0)
            if current < target * 0.9:  # < 90% etatu
                employees_to_fill.append((emp, target - current))
        
        if not employees_to_fill:
            return
        
        # Sortuj po największym niedoborze
        employees_to_fill.sort(key=lambda x: x[1], reverse=True)
        
        logger.info(f"  Employees needing hours: {len(employees_to_fill)}")
        
        # Dla każdego pracownika, dodaj zmiany w dni gdzie jest najmniej obsady
        for emp, missing_hours in employees_to_fill[:5]:  # Max 5 pracowników naraz
            self._add_shifts_for_employee(emp, missing_hours)
    
    def _add_shifts_for_employee(self, emp: Employee, missing_hours: float):
        """Dodaje zmiany dla pracownika z niedoborem godzin"""
        work_days = self._get_work_days()
        
        # Sprawdź każdy dzień i dodaj gdzie możliwe
        for date_str in work_days:
            if missing_hours <= 0:
                break
            
            # Sprawdź czy pracownik już ma zmianę tego dnia
            has_shift = any(
                s.date == date_str and s.employee_id == emp.id
                for s in self.shifts
            )
            if has_shift:
                continue
            
            # Znajdź template z najmniejszą obsadą tego dnia
            for template in self.input.templates:
                if not self._is_employee_available(emp, date_str, template):
                    continue
                
                # Dodaj zmianę
                shift = self._create_shift(emp, template, date_str)
                self.shifts.append(shift)
                self.employee_hours[emp.id] += template.get_duration_hours()
                self.employee_shifts[emp.id].append(shift)
                missing_hours -= template.get_duration_hours()
                
                logger.info(f"  Added shift for {emp.name} on {date_str}")
                break
