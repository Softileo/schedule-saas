"""
=============================================================================
EWALUATOR JAKOŚCI GRAFIKU
=============================================================================

Oblicza metryki i funkcję fitness dla grafiku.
Ocenia:
- Wyrównanie obciążenia pracą
- Zgodność z preferencjami
- Jakość rozkładu zmian
- Zgodność z Kodeksem Pracy
"""

import logging
from typing import List, Dict
from collections import defaultdict
from datetime import datetime

from .types import (
    SchedulerInput,
    GeneratedShift,
    Employee,
    POLISH_LABOR_CODE
)
from .utils import get_shift_time_type

logger = logging.getLogger(__name__)

# =============================================================================
# WAGI DLA FUNKCJI FITNESS
# =============================================================================

WEIGHTS = {
    'hours_balance': 30.0,        # Wyrównanie godzin
    'shift_balance': 20.0,        # Wyrównanie liczby zmian
    'weekend_balance': 15.0,      # Wyrównanie weekendów
    'preferences': 20.0,          # Zgodność z preferencjami
    'shift_type_balance': 10.0,   # Wyrównanie rano/popołudnie/wieczór
    'labor_code_score': 5.0       # Zgodność z KP (penalizacja naruszeń)
}

# =============================================================================
# FUNKCJE EWALUACJI
# =============================================================================

def evaluate_schedule(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> dict:
    """
    Pełna ewaluacja grafiku - wszystkie metryki
    
    Returns:
        Słownik z metrykami i fitness
    """
    # Grupuj zmiany po pracownikach
    shifts_by_employee = defaultdict(list)
    for shift in shifts:
        shifts_by_employee[shift.employee_id].append(shift)
    
    # Oblicz metryki z obsługą błędów
    try:
        hours_balance = _calculate_hours_balance(shifts, scheduler_input)
    except Exception as e:
        logger.error(f"Error calculating hours_balance: {e}")
        hours_balance = 0.5
    
    try:
        shift_balance = _calculate_shift_balance(shifts, scheduler_input)
    except Exception as e:
        logger.error(f"Error calculating shift_balance: {e}")
        shift_balance = 0.5
    
    try:
        weekend_balance = _calculate_weekend_balance(shifts, scheduler_input)
    except Exception as e:
        logger.error(f"Error calculating weekend_balance: {e}")
        weekend_balance = 0.5
    
    try:
        preferences_score = _calculate_preferences_score(shifts, scheduler_input)
    except Exception as e:
        logger.error(f"Error calculating preferences_score: {e}")
        preferences_score = 0.5
    
    try:
        shift_type_balance = _calculate_shift_type_balance(shifts, scheduler_input)
    except Exception as e:
        logger.error(f"Error calculating shift_type_balance: {e}")
        shift_type_balance = 0.5
    
    try:
        labor_code_score = _calculate_labor_code_score(shifts, scheduler_input)
    except Exception as e:
        logger.error(f"Error calculating labor_code_score: {e}")
        labor_code_score = 0.8
    
    metrics = {
        'total_shifts': len(shifts),
        'employees_count': len(shifts_by_employee),
        'hours_balance': hours_balance,
        'shift_balance': shift_balance,
        'weekend_balance': weekend_balance,
        'preferences_score': preferences_score,
        'shift_type_balance': shift_type_balance,
        'labor_code_score': labor_code_score,
    }
    
    # Oblicz fitness
    fitness = _calculate_fitness(metrics)
    metrics['fitness'] = fitness
    
    return metrics

def quick_fitness(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> float:
    """
    Szybkie obliczenie fitness (bez pełnych metryk)
    Do użycia w algorytmie genetycznym
    """
    # Uproszczone metryki
    hours_balance = _calculate_hours_balance(shifts, scheduler_input)
    shift_balance = _calculate_shift_balance(shifts, scheduler_input)
    preferences = _calculate_preferences_score(shifts, scheduler_input)
    
    # Uproszczony fitness
    fitness = (
        WEIGHTS['hours_balance'] * hours_balance +
        WEIGHTS['shift_balance'] * shift_balance +
        WEIGHTS['preferences'] * preferences
    )
    
    return fitness

# =============================================================================
# OBLICZANIE POSZCZEGÓLNYCH METRYK
# =============================================================================

def _calculate_hours_balance(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> float:
    """
    Wyrównanie godzin między pracownikami
    Zwraca: 0.0 - 1.0 (1.0 = idealne wyrównanie)
    """
    # Grupuj po pracownikach
    hours_by_employee = defaultdict(float)
    required_hours = {}
    
    employees_map = {emp.id: emp for emp in scheduler_input.employees}
    
    for shift in shifts:
        hours_by_employee[shift.employee_id] += shift.get_duration_hours()
    
    for emp in scheduler_input.employees:
        required_hours[emp.id] = emp.weekly_hours * 4.33  # ~miesiąc
    
    # Oblicz odchylenie od wymaganej liczby godzin
    total_deviation = 0.0
    for emp_id, required in required_hours.items():
        actual = hours_by_employee.get(emp_id, 0.0)
        deviation = abs(actual - required)
        total_deviation += deviation
    
    # Normalizuj do 0-1
    max_possible_deviation = sum(required_hours.values())
    if max_possible_deviation == 0:
        return 1.0
    
    balance = 1.0 - (total_deviation / max_possible_deviation)
    return max(0.0, balance)

def _calculate_shift_balance(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> float:
    """
    Wyrównanie liczby zmian między pracownikami
    Zwraca: 0.0 - 1.0
    """
    shifts_by_employee = defaultdict(int)
    
    for shift in shifts:
        shifts_by_employee[shift.employee_id] += 1
    
    if not shifts_by_employee:
        return 1.0
    
    counts = list(shifts_by_employee.values())
    avg = sum(counts) / len(counts)
    
    # Odchylenie standardowe
    variance = sum((x - avg) ** 2 for x in counts) / len(counts)
    std_dev = variance ** 0.5
    
    # Normalizuj (zakładamy max std_dev = avg)
    if avg == 0:
        return 1.0
    
    balance = 1.0 - min(std_dev / avg, 1.0)
    return max(0.0, balance)

def _calculate_weekend_balance(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> float:
    """
    Wyrównanie zmian weekendowych
    Zwraca: 0.0 - 1.0
    """
    weekend_days = set(scheduler_input.saturday_days + scheduler_input.trading_sundays)
    weekend_shifts_by_employee = defaultdict(int)
    
    for shift in shifts:
        if shift.date in weekend_days:
            weekend_shifts_by_employee[shift.employee_id] += 1
    
    if not weekend_shifts_by_employee:
        return 1.0
    
    # Dodaj pracowników bez weekendów
    for emp in scheduler_input.employees:
        if emp.id not in weekend_shifts_by_employee:
            weekend_shifts_by_employee[emp.id] = 0
    
    counts = list(weekend_shifts_by_employee.values())
    avg = sum(counts) / len(counts)
    
    if avg == 0:
        return 1.0
    
    variance = sum((x - avg) ** 2 for x in counts) / len(counts)
    std_dev = variance ** 0.5
    
    balance = 1.0 - min(std_dev / (avg + 1), 1.0)
    return max(0.0, balance)

def _calculate_preferences_score(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> float:
    """
    Zgodność z preferencjami pracowników
    Zwraca: 0.0 - 1.0
    """
    employees_map = {emp.id: emp for emp in scheduler_input.employees}
    
    total_score = 0.0
    count = 0
    
    for shift in shifts:
        emp = employees_map.get(shift.employee_id)
        if not emp or not emp.preferences:
            continue
        
        prefs = emp.preferences
        date = datetime.strptime(shift.date, '%Y-%m-%d')
        day_name = date.strftime('%A').lower()
        
        # Preferowane dni
        if prefs.preferred_days and day_name in prefs.preferred_days:
            total_score += 1.0
        
        # Unikane dni
        if prefs.avoided_days and day_name in prefs.avoided_days:
            total_score -= 0.5
        
        count += 1
    
    if count == 0:
        return 1.0
    
    # Normalizuj do 0-1
    score = (total_score / count + 1.0) / 2.0
    return max(0.0, min(1.0, score))

def _calculate_shift_type_balance(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> float:
    """
    Wyrównanie typów zmian (rano/popołudnie/wieczór)
    Zwraca: 0.0 - 1.0
    """
    shift_types_by_employee = defaultdict(lambda: {'morning': 0, 'afternoon': 0, 'evening': 0})
    
    for shift in shifts:
        shift_type = get_shift_time_type(shift.start_time)
        shift_types_by_employee[shift.employee_id][shift_type] += 1
    
    # Oblicz wyrównanie dla każdego pracownika
    balances = []
    for emp_id, types in shift_types_by_employee.items():
        counts = [types['morning'], types['afternoon'], types['evening']]
        total = sum(counts)
        
        if total == 0:
            continue
        
        # Idealne wyrównanie: każdy typ 1/3
        ideal = total / 3.0
        deviation = sum(abs(c - ideal) for c in counts)
        max_deviation = total * 2 / 3 * 2  # max gdy wszystko w jednym typie
        
        if max_deviation > 0:
            balance = 1.0 - (deviation / max_deviation)
            balances.append(balance)
    
    if not balances:
        return 1.0
    
    return sum(balances) / len(balances)

def _calculate_labor_code_score(
    shifts: List[GeneratedShift],
    scheduler_input: SchedulerInput
) -> float:
    """
    Ocena zgodności z Kodeksem Pracy
    Zwraca: 0.0 - 1.0 (1.0 = brak naruszeń)
    """
    try:
        from .validator import ScheduleValidator
        
        validator = ScheduleValidator(scheduler_input)
        violations = validator.validate_all_shifts(shifts)
        
        if not violations:
            return 1.0
        
        # Penalizacja za naruszenia
        error_count = sum(1 for v in violations if v.get('severity') == 'error')
        warning_count = sum(1 for v in violations if v.get('severity') == 'warning')
        
        # Błędy bardziej penalizowane
        penalty = error_count * 0.2 + warning_count * 0.05
        
        score = 1.0 - min(penalty, 1.0)
        return max(0.0, score)
    except Exception as e:
        logger.error(f"Error calculating labor code score: {e}")
        # W przypadku błędu zwróć neutralną ocenę
        return 0.8

def _calculate_fitness(metrics: dict) -> float:
    """
    Oblicza ogólną funkcję fitness z metryk
    
    Fitness = suma ważona wszystkich metryk
    Zwraca: 0.0 - 100.0
    """
    fitness = (
        WEIGHTS['hours_balance'] * metrics.get('hours_balance', 0.0) +
        WEIGHTS['shift_balance'] * metrics.get('shift_balance', 0.0) +
        WEIGHTS['weekend_balance'] * metrics.get('weekend_balance', 0.0) +
        WEIGHTS['preferences'] * metrics.get('preferences_score', 0.0) +
        WEIGHTS['shift_type_balance'] * metrics.get('shift_type_balance', 0.0) +
        WEIGHTS['labor_code_score'] * metrics.get('labor_code_score', 0.8)
    )
    
    return fitness
