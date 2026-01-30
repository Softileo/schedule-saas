"""
=============================================================================
FUNKCJE POMOCNICZE
=============================================================================
"""

from datetime import datetime

def get_shift_time_type(start_time: str) -> str:
    """
    Określa porę dnia zmiany na podstawie godziny rozpoczęcia
    
    Args:
        start_time: Godzina w formacie HH:MM
        
    Returns:
        'morning', 'afternoon', lub 'evening'
    """
    hour = int(start_time.split(':')[0])
    
    if hour < 12:
        return 'morning'
    elif hour < 18:
        return 'afternoon'
    else:
        return 'evening'

def get_day_of_week(date_str: str) -> str:
    """
    Zwraca nazwę dnia tygodnia
    
    Args:
        date_str: Data w formacie YYYY-MM-DD
        
    Returns:
        Nazwa dnia (np. 'monday', 'tuesday')
    """
    date = datetime.strptime(date_str, '%Y-%m-%d')
    return date.strftime('%A').lower()

def parse_time(time_str: str) -> datetime:
    """
    Parsuje string czasu do datetime
    
    Args:
        time_str: Czas w formacie HH:MM
        
    Returns:
        datetime object
    """
    return datetime.strptime(time_str, '%H:%M')

def calculate_hours_between(start_time: str, end_time: str, break_minutes: int = 0) -> float:
    """
    Oblicza liczbę godzin między dwoma czasami
    
    Args:
        start_time: Czas rozpoczęcia (HH:MM)
        end_time: Czas zakończenia (HH:MM)
        break_minutes: Długość przerwy w minutach
        
    Returns:
        Liczba godzin (float)
    """
    start = parse_time(start_time)
    end = parse_time(end_time)
    
    duration_seconds = (end - start).total_seconds()
    duration_hours = duration_seconds / 3600
    
    return duration_hours - (break_minutes / 60)
