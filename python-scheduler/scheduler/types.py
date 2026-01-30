"""
=============================================================================
TYPY DANYCH DLA SCHEDULERA
=============================================================================
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime, time

# =============================================================================
# STAŁE KODEKSU PRACY
# =============================================================================

class POLISH_LABOR_CODE:
    """Stałe zgodne z Polskim Kodeksem Pracy"""
    MAX_HOURS_PER_DAY = 12  # Art. 129
    MAX_HOURS_PER_WEEK = 48  # Art. 129
    MIN_DAILY_REST_HOURS = 11  # Art. 132
    MIN_WEEKLY_REST_HOURS = 35  # Art. 133
    MAX_HOURS_WITH_OVERTIME = 48  # Art. 131
    MIN_BREAK_MINUTES_6H = 15  # Art. 134
    MAX_CONSECUTIVE_WORK_DAYS = 6  # Art. 133
    MAX_SUNDAY_SHIFTS_PER_MONTH = 2  # Art. 151(9)

# =============================================================================
# GŁÓWNE TYPY
# =============================================================================

@dataclass
class EmployeePreferences:
    """Preferencje pracownika"""
    preferred_days: List[str] = field(default_factory=list)
    avoided_days: List[str] = field(default_factory=list)
    preferred_shift_types: List[str] = field(default_factory=list)
    max_hours_per_week: Optional[float] = None
    min_hours_per_week: Optional[float] = None

@dataclass
class EmployeeAbsence:
    """Nieobecność pracownika"""
    start_date: str
    end_date: str
    type: str

@dataclass
class Employee:
    """Pracownik"""
    id: str
    name: str
    email: str
    contract_type: str
    weekly_hours: float
    max_hours: float
    preferences: Optional[EmployeePreferences] = None
    absences: List[EmployeeAbsence] = field(default_factory=list)
    template_assignments: List[str] = field(default_factory=list)

@dataclass
class ShiftTemplate:
    """Szablon zmiany"""
    id: str
    name: str
    start_time: str
    end_time: str
    break_minutes: int
    days_of_week: List[str]
    is_weekend: bool = False
    min_employees: int = 1
    max_employees: Optional[int] = None  # None = brak limitu
    color: str = "#3b82f6"
    
    def get_duration_hours(self) -> float:
        """Oblicza długość zmiany w godzinach"""
        start = datetime.strptime(self.start_time, "%H:%M")
        end = datetime.strptime(self.end_time, "%H:%M")
        duration = (end - start).seconds / 3600
        return duration - (self.break_minutes / 60)

@dataclass
class OrganizationSettings:
    """Ustawienia organizacji"""
    work_days_per_week: int = 5
    enforce_daily_rest: bool = True
    enforce_weekly_rest: bool = True
    max_consecutive_work_days: int = 6
    min_staff_per_shift: int = 1
    max_sunday_shifts_per_month: int = 2
    balance_shift_distribution: bool = True

@dataclass
class PublicHoliday:
    """Święto państwowe"""
    date: str
    name: str

@dataclass
class GeneratedShift:
    """Wygenerowana zmiana"""
    employee_id: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    break_minutes: int
    template_id: Optional[str] = None
    
    def get_duration_hours(self) -> float:
        """Oblicza długość zmiany w godzinach"""
        start = datetime.strptime(self.start_time, "%H:%M")
        end = datetime.strptime(self.end_time, "%H:%M")
        duration = (end - start).seconds / 3600
        return duration - (self.break_minutes / 60)
    
    @staticmethod
    def from_dict(data: dict) -> 'GeneratedShift':
        """Tworzy instancję z dict"""
        return GeneratedShift(
            employee_id=data['employee_id'],
            date=data['date'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            break_minutes=data['break_minutes'],
            template_id=data.get('template_id')
        )
    
    def to_dict(self) -> dict:
        """Konwertuje na dict"""
        return {
            'employee_id': self.employee_id,
            'date': self.date,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'break_minutes': self.break_minutes,
            'template_id': self.template_id
        }

@dataclass
class ShiftTypeDistribution:
    """Rozkład zmian według pory dnia"""
    morning: int = 0
    afternoon: int = 0
    evening: int = 0

@dataclass
class QuarterlyShiftHistory:
    """Historia zmian w kwartale"""
    shifts_per_employee: Dict[str, int] = field(default_factory=dict)
    hours_per_employee: Dict[str, float] = field(default_factory=dict)
    shift_type_distribution: Dict[str, ShiftTypeDistribution] = field(default_factory=dict)
    average_shifts: float = 0.0
    average_hours: float = 0.0
    average_shift_types: ShiftTypeDistribution = field(default_factory=ShiftTypeDistribution)

@dataclass
class SchedulerInput:
    """Dane wejściowe do schedulera"""
    year: int
    month: int
    employees: List[Employee]
    templates: List[ShiftTemplate]
    settings: OrganizationSettings
    holidays: List[PublicHoliday]
    work_days: List[str]
    saturday_days: List[str]
    trading_sundays: List[str]
    template_assignments_map: Dict[str, List[str]] = field(default_factory=dict)
    quarterly_history: Optional[QuarterlyShiftHistory] = None
    
    @staticmethod
    def from_dict(data: dict) -> 'SchedulerInput':
        """Tworzy instancję z dict"""
        # Parsuj pracowników
        employees = []
        for emp_data in data.get('employees', []):
            prefs = None
            if emp_data.get('preferences'):
                prefs = EmployeePreferences(**emp_data['preferences'])
            
            absences = [EmployeeAbsence(**abs_data) 
                       for abs_data in emp_data.get('absences', [])]
            
            employees.append(Employee(
                id=emp_data['id'],
                name=emp_data['name'],
                email=emp_data['email'],
                contract_type=emp_data['contract_type'],
                weekly_hours=emp_data['weekly_hours'],
                max_hours=emp_data['max_hours'],
                preferences=prefs,
                absences=absences,
                template_assignments=emp_data.get('template_assignments', [])
            ))
        
        # Parsuj szablony
        templates = [ShiftTemplate(**tmpl) for tmpl in data.get('templates', [])]
        
        # Parsuj ustawienia
        settings = OrganizationSettings(**data.get('settings', {}))
        
        # Parsuj święta
        holidays = [PublicHoliday(**hol) for hol in data.get('holidays', [])]
        
        return SchedulerInput(
            year=data['year'],
            month=data['month'],
            employees=employees,
            templates=templates,
            settings=settings,
            holidays=holidays,
            work_days=data.get('work_days', []),
            saturday_days=data.get('saturday_days', []),
            trading_sundays=data.get('trading_sundays', []),
            template_assignments_map=data.get('template_assignments_map', {})
        )

@dataclass
class EmployeeScheduleState:
    """Stan pracownika podczas generowania"""
    employee: Employee
    required_hours: float
    current_hours: float = 0.0
    shifts: List[GeneratedShift] = field(default_factory=list)
    weekend_shift_count: int = 0
    saturday_shift_count: int = 0
    sunday_shift_count: int = 0
    morning_shift_count: int = 0
    afternoon_shift_count: int = 0
    evening_shift_count: int = 0
    occupied_dates: Set[str] = field(default_factory=set)
    last_shift_date: Optional[str] = None
    consecutive_work_days: int = 0
