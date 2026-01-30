"""
=============================================================================
WALIDATOR GRAFIKU - ZGODNOŚĆ Z KODEKSEM PRACY
=============================================================================

Waliduje grafik pod kątem przepisów Kodeksu Pracy:
- Art. 129: Maksymalne normy czasu pracy
- Art. 132: Odpoczynek dobowy (11h)
- Art. 133: Odpoczynek tygodniowy (35h)
- Art. 134: Przerwy w pracy
- Art. 151: Praca w niedziele
"""

import logging
from typing import List, Dict, Set
from datetime import datetime, timedelta
from collections import defaultdict

from .types import (
    SchedulerInput,
    GeneratedShift,
    Employee,
    POLISH_LABOR_CODE
)

logger = logging.getLogger(__name__)

# =============================================================================
# NARUSZENIA
# =============================================================================

class Violation:
    """Naruszenie przepisu Kodeksu Pracy"""
    
    def __init__(
        self,
        employee_id: str,
        date: str,
        rule: str,
        description: str,
        severity: str = 'error'
    ):
        self.employee_id = employee_id
        self.date = date
        self.rule = rule
        self.description = description
        self.severity = severity  # 'error', 'warning'
    
    def to_dict(self) -> dict:
        return {
            'employee_id': self.employee_id,
            'date': self.date,
            'rule': self.rule,
            'description': self.description,
            'severity': self.severity
        }

# =============================================================================
# GŁÓWNA KLASA WALIDATORA
# =============================================================================

class ScheduleValidator:
    """Waliduje grafik pod kątem Kodeksu Pracy"""
    
    def __init__(self, scheduler_input: SchedulerInput):
        self.input = scheduler_input
        self.employees_map = {emp.id: emp for emp in scheduler_input.employees}
        self.holidays_set = {h.date for h in scheduler_input.holidays}
    
    def validate_all_shifts(self, shifts: List[GeneratedShift]) -> List[dict]:
        """
        Waliduje wszystkie zmiany w grafiku
        
        Returns:
            Lista naruszeń
        """
        violations = []
        
        # Grupuj zmiany po pracownikach
        shifts_by_employee = defaultdict(list)
        for shift in shifts:
            shifts_by_employee[shift.employee_id].append(shift)
        
        # Sortuj zmiany po dacie
        for emp_id in shifts_by_employee:
            shifts_by_employee[emp_id].sort(key=lambda s: s.date)
        
        # Waliduj dla każdego pracownika
        for emp_id, emp_shifts in shifts_by_employee.items():
            violations.extend(self._validate_employee_shifts(emp_id, emp_shifts))
        
        return [v.to_dict() for v in violations]
    
    def _validate_employee_shifts(
        self, 
        employee_id: str, 
        shifts: List[GeneratedShift]
    ) -> List[Violation]:
        """Waliduje zmiany dla jednego pracownika"""
        violations = []
        employee = self.employees_map.get(employee_id)
        
        if not employee:
            return violations
        
        # 1. Maksymalny czas pracy dziennie
        violations.extend(self._check_max_daily_hours(employee, shifts))
        
        # 2. Maksymalny czas pracy tygodniowo
        violations.extend(self._check_max_weekly_hours(employee, shifts))
        
        # 3. Odpoczynek dobowy (11h)
        violations.extend(self._check_daily_rest(employee, shifts))
        
        # 4. Odpoczynek tygodniowy (35h)
        violations.extend(self._check_weekly_rest(employee, shifts))
        
        # 5. Maksymalna liczba kolejnych dni pracy
        violations.extend(self._check_consecutive_work_days(employee, shifts))
        
        # 6. Praca w niedziele
        violations.extend(self._check_sunday_work(employee, shifts))
        
        return violations
    
    # =========================================================================
    # SPRAWDZANIE POSZCZEGÓLNYCH REGUŁ
    # =========================================================================
    
    def _check_max_daily_hours(
        self, 
        employee: Employee, 
        shifts: List[GeneratedShift]
    ) -> List[Violation]:
        """Sprawdza przekroczenie maksymalnego czasu pracy dziennie (Art. 129)"""
        violations = []
        
        for shift in shifts:
            hours = shift.get_duration_hours()
            
            if hours > POLISH_LABOR_CODE.MAX_HOURS_PER_DAY:
                violations.append(Violation(
                    employee_id=employee.id,
                    date=shift.date,
                    rule='Art. 129 § 1',
                    description=f'Przekroczenie maksymalnego czasu pracy: {hours:.1f}h (max 8h)',
                    severity='error'
                ))
        
        return violations
    
    def _check_max_weekly_hours(
        self,
        employee: Employee,
        shifts: List[GeneratedShift]
    ) -> List[Violation]:
        """Sprawdza przekroczenie maksymalnego czasu pracy tygodniowo (Art. 129)"""
        violations = []
        
        # Grupuj po tygodniach
        weeks = defaultdict(list)
        for shift in shifts:
            date = datetime.strptime(shift.date, '%Y-%m-%d')
            week_num = date.isocalendar()[1]
            weeks[week_num].append(shift)
        
        # Sprawdź każdy tydzień
        for week_num, week_shifts in weeks.items():
            total_hours = sum(s.get_duration_hours() for s in week_shifts)
            
            if total_hours > POLISH_LABOR_CODE.MAX_HOURS_PER_WEEK:
                violations.append(Violation(
                    employee_id=employee.id,
                    date=week_shifts[0].date,
                    rule='Art. 129 § 1',
                    description=f'Przekroczenie czasu pracy w tygodniu: {total_hours:.1f}h (max 40h)',
                    severity='error'
                ))
        
        return violations
    
    def _check_daily_rest(
        self,
        employee: Employee,
        shifts: List[GeneratedShift]
    ) -> List[Violation]:
        """Sprawdza odpoczynek dobowy - 11h (Art. 132)"""
        violations = []
        
        for i in range(len(shifts) - 1):
            current = shifts[i]
            next_shift = shifts[i + 1]
            
            # Oblicz czas między zmianami
            current_end = datetime.strptime(
                f"{current.date} {current.end_time}", 
                '%Y-%m-%d %H:%M'
            )
            next_start = datetime.strptime(
                f"{next_shift.date} {next_shift.start_time}",
                '%Y-%m-%d %H:%M'
            )
            
            rest_hours = (next_start - current_end).total_seconds() / 3600
            
            if rest_hours < POLISH_LABOR_CODE.MIN_DAILY_REST_HOURS:
                violations.append(Violation(
                    employee_id=employee.id,
                    date=current.date,
                    rule='Art. 132 § 1',
                    description=f'Za krótki odpoczynek dobowy: {rest_hours:.1f}h (min 11h)',
                    severity='error'
                ))
        
        return violations
    
    def _check_weekly_rest(
        self,
        employee: Employee,
        shifts: List[GeneratedShift]
    ) -> List[Violation]:
        """Sprawdza odpoczynek tygodniowy - 35h (Art. 133)"""
        violations = []
        
        # Grupuj po tygodniach
        weeks = defaultdict(list)
        for shift in shifts:
            date = datetime.strptime(shift.date, '%Y-%m-%d')
            week_num = date.isocalendar()[1]
            weeks[week_num].append(shift)
        
        # Sprawdź odpoczynek między tygodniami
        sorted_weeks = sorted(weeks.keys())
        for i in range(len(sorted_weeks) - 1):
            current_week = weeks[sorted_weeks[i]]
            next_week = weeks[sorted_weeks[i + 1]]
            
            # Ostatnia zmiana bieżącego tygodnia
            last_shift = max(current_week, key=lambda s: s.date)
            last_end = datetime.strptime(
                f"{last_shift.date} {last_shift.end_time}",
                '%Y-%m-%d %H:%M'
            )
            
            # Pierwsza zmiana następnego tygodnia
            first_shift = min(next_week, key=lambda s: s.date)
            first_start = datetime.strptime(
                f"{first_shift.date} {first_shift.start_time}",
                '%Y-%m-%d %H:%M'
            )
            
            rest_hours = (first_start - last_end).total_seconds() / 3600
            
            if rest_hours < POLISH_LABOR_CODE.MIN_WEEKLY_REST_HOURS:
                violations.append(Violation(
                    employee_id=employee.id,
                    date=last_shift.date,
                    rule='Art. 133',
                    description=f'Za krótki odpoczynek tygodniowy: {rest_hours:.1f}h (min 35h)',
                    severity='error'
                ))
        
        return violations
    
    def _check_consecutive_work_days(
        self,
        employee: Employee,
        shifts: List[GeneratedShift]
    ) -> List[Violation]:
        """Sprawdza maksymalną liczbę kolejnych dni pracy (Art. 133)"""
        violations = []
        
        # Sprawdź sekwencje kolejnych dni
        consecutive_days = 1
        prev_date = None
        
        for shift in shifts:
            current_date = datetime.strptime(shift.date, '%Y-%m-%d')
            
            if prev_date:
                days_diff = (current_date - prev_date).days
                
                if days_diff == 1:
                    consecutive_days += 1
                else:
                    consecutive_days = 1
            
            if consecutive_days > POLISH_LABOR_CODE.MAX_CONSECUTIVE_WORK_DAYS:
                violations.append(Violation(
                    employee_id=employee.id,
                    date=shift.date,
                    rule='Art. 133',
                    description=f'{consecutive_days} kolejnych dni pracy (max 6)',
                    severity='error'
                ))
            
            prev_date = current_date
        
        return violations
    
    def _check_sunday_work(
        self,
        employee: Employee,
        shifts: List[GeneratedShift]
    ) -> List[Violation]:
        """Sprawdza pracę w niedziele (Art. 151)"""
        violations = []
        
        # Policz niedziele
        sunday_count = 0
        trading_sundays = set(self.input.trading_sundays)
        
        for shift in shifts:
            date = datetime.strptime(shift.date, '%Y-%m-%d')
            
            # Sprawdź czy niedziela
            if date.weekday() == 6 and shift.date in trading_sundays:
                sunday_count += 1
        
        if sunday_count > POLISH_LABOR_CODE.MAX_SUNDAY_SHIFTS_PER_MONTH:
            violations.append(Violation(
                employee_id=employee.id,
                date='',
                rule='Art. 151(9)',
                description=f'{sunday_count} zmian w niedziele (max 2/miesiąc)',
                severity='warning'
            ))
        
        return violations
