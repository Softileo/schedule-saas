"""
================================================================================
TEST GENERATORA GRAFIKÓW CP-SAT - Zaawansowane losowe scenariusze
================================================================================
Testuje różne konfiguracje:
- Różne miesiące (1-12)
- Różne godziny otwarcia (6h-24h)
- Szablony zmian pokrywające cały dzień (1-10 szablonów)
- Soboty/niedziele handlowe, dni zamknięte
- Realistyczna liczba pracowników
================================================================================
"""

import requests
import random
import uuid
from datetime import date
import calendar

# ============================================================================
# KONFIGURACJA
# ============================================================================

BASE_URL = "http://localhost:8080"
API_KEY = "schedule-saas-local-dev-2026"
HEADERS = {"Content-Type": "application/json", "X-API-Key": API_KEY}

FIRST_NAMES = ["Anna", "Jan", "Maria", "Piotr", "Katarzyna", "Tomasz", "Michał", "Ewa",
               "Kamil", "Agnieszka", "Paweł", "Magdalena", "Krzysztof", "Joanna", "Andrzej",
               "Barbara", "Marcin", "Aleksandra", "Łukasz", "Monika", "Robert", "Natalia"]
LAST_NAMES = ["Nowak", "Kowalski", "Wiśniewski", "Dąbrowski", "Kot", "Lewandowski", 
              "Zieliński", "Szymański", "Woźniak", "Kozłowski", "Jankowski", "Mazur"]
COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"]


# ============================================================================
# GENERATOR SCENARIUSZA
# ============================================================================

def generate_covering_templates(open_hour: int, close_hour: int, num_templates: int) -> list:
    """
    Generuje szablony zmian pokrywające cały dzień otwarcia.
    Szablony mogą się nakładać, ale razem muszą pokryć cały okres.
    """
    total_hours = close_hour - open_hour
    if close_hour <= open_hour:  # Przez północ (np. 6:00-2:00)
        total_hours = (24 - open_hour) + close_hour
    
    templates = []
    
    if num_templates == 1:
        # Jedna zmiana na cały dzień
        templates.append({
            'start': open_hour,
            'end': close_hour,
            'name': f'Cały dzień ({total_hours}h)'
        })
    elif num_templates == 2:
        # Dwie zmiany - podziel na pół z godzinnym nakładaniem
        mid = open_hour + total_hours // 2
        templates.append({
            'start': open_hour,
            'end': mid + 1,  # +1h nakładka
            'name': f'Zmiana I ({mid + 1 - open_hour}h)'
        })
        templates.append({
            'start': mid,
            'end': close_hour,
            'name': f'Zmiana II ({close_hour - mid}h)'
        })
    elif num_templates == 3:
        # Trzy zmiany 8h z nakładkami
        shift_len = max(6, total_hours // 3 + 2)
        for i in range(3):
            start = open_hour + i * (total_hours // 3)
            end = min(start + shift_len, close_hour if close_hour > open_hour else 24)
            if end <= start:
                end = close_hour
            templates.append({
                'start': start,
                'end': end,
                'name': f'Zmiana {["Poranna", "Dzienna", "Wieczorna"][i]} ({end - start}h)'
            })
    else:
        # Wiele zmian - elastyczne pokrycie
        shift_duration = max(4, min(12, total_hours // (num_templates - 1) + 2))
        overlap = max(1, shift_duration // 4)
        
        current = open_hour
        for i in range(num_templates):
            start = current
            end = min(start + shift_duration, close_hour if close_hour > open_hour else 24)
            
            if i == num_templates - 1:
                end = close_hour  # Ostatnia zmiana kończy na zamknięciu
            
            if end > start:
                templates.append({
                    'start': start,
                    'end': end,
                    'name': f'Zmiana {i+1} ({end - start}h)'
                })
            
            current = start + shift_duration - overlap
            if current >= (close_hour if close_hour > open_hour else 24):
                break
    
    return templates


def calculate_min_employees(open_hours: int, work_days: int, shift_hours: float, 
                            min_per_shift: int, include_saturday: bool, 
                            include_sunday: bool, saturdays: int, sundays: int) -> int:
    """
    Oblicza minimalną liczbę pracowników potrzebnych do pokrycia grafiku.
    """
    # Godziny do pokrycia tygodniowo
    weekday_hours = open_hours * 5 * min_per_shift  # Pn-Pt
    saturday_hours = open_hours * min_per_shift if include_saturday else 0
    sunday_hours = open_hours * min_per_shift if include_sunday else 0
    
    weekly_hours_needed = weekday_hours + saturday_hours + sunday_hours
    
    # Każdy pracownik może pracować max ~40h/tyg (pełny etat)
    # Z uwzględnieniem mixu etatów (średnio 0.75)
    avg_hours_per_employee = 35
    
    min_employees = max(3, int(weekly_hours_needed / avg_hours_per_employee) + 1)
    
    return min_employees


def generate_scenario(seed: int = None) -> dict:
    """Generuje zaawansowany losowy scenariusz testowy."""
    
    if seed:
        random.seed(seed)
    
    # Losowy miesiąc
    year = 2026
    month = random.randint(1, 12)
    days_in_month = calendar.monthrange(year, month)[1]
    
    # Oblicz dni tygodnia
    weekdays = saturdays = sundays = 0
    for d in range(1, days_in_month + 1):
        wd = date(year, month, d).weekday()
        if wd < 5:
            weekdays += 1
        elif wd == 5:
            saturdays += 1
        else:
            sundays += 1
    
    # === KONFIGURACJA SKLEPU ===
    
    # Losowe godziny otwarcia (6h - 24h dziennie)
    daily_hours = random.choice([6, 8,7,9, 10, 12, 14, 16, 18, 20, 24])
    
    if daily_hours == 24:
        open_hour, close_hour = 0, 0  # 00:00-00:00 = 24h
    else:
        # Losowa godzina otwarcia
        possible_opens = list(range(5, 14))  # 5:00 - 13:00
        open_hour = random.choice(possible_opens)
        close_hour = open_hour + daily_hours
        if close_hour > 24:
            close_hour = 24
    
    # Soboty i niedziele
    include_saturday = random.random() > 0.2  # 80% ma soboty
    include_sunday = random.random() > 0.7    # 30% ma niedziele handlowe
    
    # Dni zamknięte (losowo 0-3 dni w środku tygodnia)
    closed_weekdays = []
    if random.random() > 0.7:  # 30% szans na zamknięty dzień
        closed_day_idx = random.choice([2, 3])  # Środa lub Czwartek
        closed_weekdays = [['wednesday', 'thursday'][closed_day_idx - 2]]
    
    # === SZABLONY ZMIAN ===
    
    num_templates = random.randint(1, min(10, max(1, daily_hours // 4)))
    template_configs = generate_covering_templates(open_hour, close_hour if close_hour != 0 else 24, num_templates)
    
    # Dni stosowania szablonów
    base_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    for closed in closed_weekdays:
        if closed in base_days:
            base_days.remove(closed)
    
    all_days = base_days.copy()
    if include_saturday:
        all_days.append('saturday')
    if include_sunday:
        all_days.append('sunday')
    
    # Min/max employees per shift
    min_emp_per_shift = random.randint(1, 3)
    max_emp_per_shift = min_emp_per_shift + random.randint(1, 4)
    
    templates = []
    for i, cfg in enumerate(template_configs):
        start_str = f"{cfg['start']:02d}:00"
        end_str = f"{cfg['end']:02d}:00" if cfg['end'] < 24 else "00:00"
        
        templates.append({
            'id': str(uuid.uuid4()),
            'name': cfg['name'],
            'start_time': start_str,
            'end_time': end_str,
            'min_employees': min_emp_per_shift if i == 0 else random.randint(0, min_emp_per_shift),
            'max_employees': max_emp_per_shift,
            'applicable_days': all_days,
            'color': COLORS[i % len(COLORS)]
        })
    
    # === PRACOWNICY ===
    
    # Oblicz minimalną liczbę pracowników
    avg_shift_hours = sum(t['end'] - t['start'] if t['end'] > t['start'] else 24 - t['start'] + t['end'] 
                          for t in template_configs) / len(template_configs)
    
    min_employees = calculate_min_employees(
        daily_hours, weekdays, avg_shift_hours, min_emp_per_shift,
        include_saturday, include_sunday, saturdays, sundays
    )
    
    # Dodaj margines 20-50%
    num_employees = min_employees + random.randint(int(min_employees * 0.2), int(min_employees * 0.5) + 1)
    num_employees = max(4, min(25, num_employees))  # 4-25 pracowników
    
    # Mix etatów
    emp_types = ['full'] * 6 + ['half'] * 2 + ['three_quarter'] * 2
    
    # Norma miesięczna - bazujemy na średniej długości zmiany
    work_days = weekdays
    if include_saturday:
        work_days += saturdays
    
    # Oblicz średnią długość zmiany
    avg_shift_hours_calc = sum(
        t['end'] - t['start'] if t['end'] > t['start'] else 24 - t['start'] + t['end'] 
        for t in template_configs
    ) / len(template_configs)
    
    # Norma miesięczna = dni robocze * 8h (standard)
    monthly_norm = work_days * 8
    
    # Max osiągalne godziny = dni robocze * średnia zmiana
    max_achievable = int(work_days * avg_shift_hours_calc)
    
    employees = []
    used_names = set()
    
    # Losowo decyduj o kierownikach: 0-3 kierowników (30% szans że są)
    has_supervisors = random.random() > 0.7
    num_supervisors = random.randint(1, min(3, num_employees // 3 + 1)) if has_supervisors else 0
    
    for i in range(num_employees):
        while True:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            if name not in used_names:
                used_names.add(name)
                break
        
        emp_type = random.choice(emp_types)
        multiplier = {'full': 1.0, 'half': 0.5, 'three_quarter': 0.75}.get(emp_type, 1.0)
        
        # Użyj mniejszej z norm: standard lub osiągalna
        effective_norm = min(monthly_norm, max_achievable)
        
        # Pierwsi num_supervisors pracowników to kierownicy
        is_supervisor = i < num_supervisors
        
        employees.append({
            'id': str(uuid.uuid4()),
            'first_name': name.split()[0],
            'last_name': name.split()[1],
            'employment_type': emp_type,
            'max_hours': int(effective_norm * multiplier),
            'is_active': True,
            'is_supervisor': is_supervisor,
            'color': random.choice(COLORS)
        })
    
    # === NIEDZIELE HANDLOWE ===
    trading_sundays = []
    if include_sunday:
        for d in range(1, days_in_month + 1):
            if date(year, month, d).weekday() == 6:
                if random.random() > 0.5:  # 50% niedziel handlowych
                    trading_sundays.append({
                        'date': date(year, month, d).strftime('%Y-%m-%d'),
                        'is_active': True
                    })
    
    # === GODZINY OTWARCIA PER-DAY (z uwzględnieniem zamkniętych dni) ===
    opening_hours = {}
    day_names_list = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    for day_name in day_names_list:
        if day_name in closed_weekdays:
            opening_hours[day_name] = {'open': None, 'close': None}
        elif day_name == 'sunday':
            if include_sunday:
                opening_hours[day_name] = {
                    'open': f'{open_hour:02d}:00',
                    'close': f'{close_hour:02d}:00' if close_hour > 0 else '00:00'
                }
            else:
                opening_hours[day_name] = {'open': None, 'close': None}
        elif day_name == 'saturday':
            if include_saturday:
                opening_hours[day_name] = {
                    'open': f'{open_hour:02d}:00',
                    'close': f'{close_hour:02d}:00' if close_hour > 0 else '00:00'
                }
            else:
                opening_hours[day_name] = {'open': None, 'close': None}
        else:
            opening_hours[day_name] = {
                'open': f'{open_hour:02d}:00',
                'close': f'{close_hour:02d}:00' if close_hour > 0 else '00:00'
            }

    return {
        'year': year,
        'month': month,
        'monthly_hours_norm': min(monthly_norm, max_achievable),  # Użyj osiągalnej normy
        'organization_settings': {
            'store_open_time': f'{open_hour:02d}:00',
            'store_close_time': f'{close_hour:02d}:00' if close_hour > 0 else '00:00',
            'min_employees_per_shift': min_emp_per_shift,
            'enable_trading_sundays': len(trading_sundays) > 0,
            'opening_hours': opening_hours
        },
        'shift_templates': templates,
        'employees': employees,
        'employee_preferences': [],
        'employee_absences': [],
        'scheduling_rules': {
            'max_consecutive_days': 6,
            'min_daily_rest_hours': 11,
            'max_weekly_work_hours': 48
        },
        'trading_sundays': trading_sundays,
        'solver_time_limit': 30,
        # Metadata dla logowania
        '_meta': {
            'daily_hours': daily_hours,
            'include_saturday': include_saturday,
            'include_sunday': include_sunday,
            'trading_sundays_count': len(trading_sundays),
            'closed_days': closed_weekdays,
            'min_employees_calculated': min_employees,
            'num_supervisors': num_supervisors
        }
    }


# ============================================================================
# WALIDACJA
# ============================================================================

def validate_schedule(scenario: dict, result: dict) -> dict:
    """Waliduje grafik i zwraca podsumowanie."""
    
    summary = {'passed': [], 'failed': [], 'warnings': []}
    
    if not result.get('success'):
        summary['failed'].append(f"Generator failed: {result.get('error', 'Unknown')}")
        return summary
    
    schedule = result.get('schedule', {})
    stats = result.get('statistics', {})
    employees = {e['id']: e for e in scenario['employees']}
    templates = {t['id']: t for t in scenario['shift_templates']}
    
    year, month = scenario['year'], scenario['month']
    days_in_month = calendar.monthrange(year, month)[1]
    
    # Trading sundays jako set
    trading_sunday_dates = {ts['date'] for ts in scenario.get('trading_sundays', [])}
    
    # ========== R1: Sprawdź godziny pracowników ==========
    hours_ok = 0
    hours_warning = 0
    hours_failed = 0
    
    # Oblicz maksymalną długość zmiany (do ustalenia progu tolerancji)
    max_shift_hours = 8  # default
    for tmpl in templates.values():
        start = int(tmpl['start_time'].split(':')[0]) * 60 + int(tmpl['start_time'].split(':')[1])
        end = int(tmpl['end_time'].split(':')[0]) * 60 + int(tmpl['end_time'].split(':')[1])
        if end == 0:
            end = 1440
        if end <= start:
            end += 24 * 60
        shift_h = (end - start) / 60
        max_shift_hours = max(max_shift_hours, shift_h)
    
    # Próg tolerancji = max(8h, max_shift_duration) - bo z grubymi zmianami
    # solver nie może idealnie trafić w target
    hours_tolerance = max(8, max_shift_hours)
    
    for emp_id, emp in employees.items():
        max_hours = emp.get('max_hours', 200)
        actual_hours = 0
        
        emp_schedule = schedule.get(emp_id, {})
        for day_str, shifts in emp_schedule.items():
            for shift in shifts:
                tmpl_id = shift.get('template_id')
                if tmpl_id and tmpl_id in templates:
                    tmpl = templates[tmpl_id]
                    start = int(tmpl['start_time'].split(':')[0]) * 60 + int(tmpl['start_time'].split(':')[1])
                    end = int(tmpl['end_time'].split(':')[0]) * 60 + int(tmpl['end_time'].split(':')[1])
                    
                    if end == 0:
                        end = 1440
                    if end <= start:
                        end += 24 * 60
                    
                    actual_hours += (end - start) / 60
        
        emp_name = f"{emp['first_name']} {emp['last_name']}"
        
        if actual_hours > max_hours + hours_tolerance:
            summary['failed'].append(f"R1: {emp_name} przekroczył: {actual_hours:.0f}h > {max_hours}h")
            hours_failed += 1
        elif actual_hours < max_hours * 0.3:
            summary['warnings'].append(f"R1: {emp_name} niedociągnięcie: {actual_hours:.0f}h / {max_hours}h")
            hours_warning += 1
        else:
            hours_ok += 1
    
    if hours_failed == 0:
        summary['passed'].append(f"R1: Godziny OK ({hours_ok} pracowników w normie)")
    
    # ========== R2: Sprawdź pokrycie dni roboczych ==========
    uncovered = 0
    include_saturday = scenario['_meta']['include_saturday']
    closed_days = scenario.get('_meta', {}).get('closed_days', [])
    day_names_map = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    for day in range(1, days_in_month + 1):
        d = date(year, month, day)
        weekday = d.weekday()
        day_str = d.strftime('%Y-%m-%d')
        
        # Pomiń zamknięte dni tygodnia
        if day_names_map[weekday] in closed_days:
            continue
        
        # Pomiń weekendy jeśli nie są handlowe
        if weekday == 6 and day_str not in trading_sunday_dates:
            continue
        if weekday == 5 and not include_saturday:
            continue
        if weekday >= 5:
            continue  # Sobota/niedziela - sprawdzamy osobno
        
        has_shift = any(day_str in emp_schedule for emp_schedule in schedule.values())
        if not has_shift:
            uncovered += 1
    
    if uncovered == 0:
        summary['passed'].append("R2: Wszystkie dni robocze pokryte")
    else:
        summary['failed'].append(f"R2: {uncovered} dni roboczych bez pokrycia")
    
    # ========== R3: Sprawdź max 1 zmiana dziennie ==========
    double_shifts = 0
    for emp_id, emp_schedule in schedule.items():
        for day_str, shifts in emp_schedule.items():
            if len(shifts) > 1:
                double_shifts += 1
    
    if double_shifts == 0:
        summary['passed'].append("R3: Max 1 zmiana/dzień OK")
    else:
        summary['failed'].append(f"R3: {double_shifts} przypadków > 1 zmiany/dzień")
    
    # ========== R4: Sprawdź niedziele ==========
    sunday_violations = 0
    for day in range(1, days_in_month + 1):
        d = date(year, month, day)
        if d.weekday() != 6:
            continue
        
        day_str = d.strftime('%Y-%m-%d')
        is_trading = day_str in trading_sunday_dates
        
        shifts_count = sum(
            len(emp_schedule.get(day_str, []))
            for emp_schedule in schedule.values()
        )
        
        if is_trading and shifts_count == 0:
            sunday_violations += 1
        elif not is_trading and shifts_count > 0:
            sunday_violations += 1
    
    if sunday_violations == 0:
        summary['passed'].append("R4: Niedziele OK")
    else:
        summary['failed'].append(f"R4: {sunday_violations} naruszeń logiki niedziel")
    
    # ========== R5: Sprawdź kierowników - min 1 na dzień pracy (jeśli są kierownicy) ==========
    supervisor_ids = {e['id'] for e in scenario['employees'] if e.get('is_supervisor')}
    if supervisor_ids:
        violations = 0
        days_checked = 0
        include_saturday = scenario['_meta']['include_saturday']
        
        for day in range(1, days_in_month + 1):
            d = date(year, month, day)
            weekday = d.weekday()
            day_str = d.strftime('%Y-%m-%d')
            
            # Pomiń weekendy jeśli nie są handlowe
            if weekday == 6 and day_str not in trading_sunday_dates:
                continue
            if weekday == 5 and not include_saturday:
                continue
            
            # Sprawdź czy ktokolwiek pracuje tego dnia
            anyone_working = False
            supervisor_working = False
            
            for emp in scenario['employees']:
                emp_id = emp['id']
                emp_schedule = schedule.get(emp_id, {})
                if day_str in emp_schedule and emp_schedule[day_str]:
                    shifts_list = emp_schedule[day_str]
                    # Obsługa różnych formatów: lista lub dict
                    if isinstance(shifts_list, list):
                        if len(shifts_list) > 0:
                            anyone_working = True
                            if emp_id in supervisor_ids:
                                supervisor_working = True
                    elif isinstance(shifts_list, dict):
                        anyone_working = True
                        if emp_id in supervisor_ids:
                            supervisor_working = True
            
            if anyone_working:
                days_checked += 1
                if not supervisor_working:
                    violations += 1
        
        if violations == 0:
            summary['passed'].append(f"R5: Min 1 kierownik/dzień ({len(supervisor_ids)} kierowników, {days_checked} dni)")
        else:
            summary['warnings'].append(f"R5: {violations}/{days_checked} dni bez kierownika")
    
    # ========== R6: Sprawdź czy każda zmiana ma min 1 pracownika ==========
    coverage_violations = 0
    include_saturday = scenario['_meta']['include_saturday']
    
    for day in range(1, days_in_month + 1):
        d = date(year, month, day)
        weekday = d.weekday()
        day_str = d.strftime('%Y-%m-%d')
        
        # Pomiń zamknięte dni tygodnia
        if day_names_map[weekday] in closed_days:
            continue
        
        # Pomiń weekendy jeśli nie są handlowe
        if weekday == 6 and day_str not in trading_sunday_dates:
            continue
        if weekday == 5 and not include_saturday:
            continue
        
        # Sprawdź czy ktokolwiek pracuje w tym dniu
        anyone_working = False
        for emp in scenario['employees']:
            emp_id = emp['id']
            emp_schedule = schedule.get(emp_id, {})
            if day_str in emp_schedule and emp_schedule[day_str]:
                anyone_working = True
                break
        
        if not anyone_working:
            coverage_violations += 1
    
    if coverage_violations == 0:
        summary['passed'].append("R6: Coverage OK (min 1 pracownik/dzień)")
    else:
        summary['failed'].append(f"R6: {coverage_violations} dni bez pracownika!")
    
    # ========== Statystyki ==========
    summary['stats'] = {
        'total_shifts': stats.get('total_shifts', 0),
        'solver_status': stats.get('solver_status', 'UNKNOWN'),
        'solve_time': stats.get('solve_time_seconds', 0),
        'quality_score': stats.get('quality_score', 0)
    }
    
    return summary


# ============================================================================
# MAIN
# ============================================================================

def main(seed: int = None):
    print("\n" + "="*70)
    print("  TEST GENERATORA GRAFIKÓW CP-SAT - ZAAWANSOWANY")
    print("="*70)
    
    # Health check
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code != 200:
            print("[FAIL] Scheduler niedostepny!")
            return False
        print(f"[OK] Scheduler OK (v{r.json().get('version', '?')})")
    except Exception as e:
        print(f"[FAIL] Nie mozna polaczyc z {BASE_URL}: {e}")
        return False
    
    # Generuj losowy scenariusz - użyj przekazanego seed lub wygeneruj losowy
    if seed is None:
        seed = random.randint(1, 999999)
    scenario = generate_scenario(seed)
    meta = scenario.get('_meta', {})
    
    print(f"\nSeed: {seed}")
    
    print(f"\nSCENARIUSZ:")
    print(f"   Miesiąc: {scenario['month']}/{scenario['year']}")
    print(f"   Godziny otwarcia: {scenario['organization_settings']['store_open_time']} - {scenario['organization_settings']['store_close_time']} ({meta.get('daily_hours', '?')}h)")
    print(f"   Soboty: {'TAK' if meta.get('include_saturday') else 'NIE'}")
    print(f"   Niedziele handlowe: {meta.get('trading_sundays_count', 0)}")
    if meta.get('closed_days'):
        print(f"   Zamknięte dni: {', '.join(meta['closed_days'])}")
    supervisors = meta.get('num_supervisors', 0)
    print(f"   Pracownicy: {len(scenario['employees'])} (min. obliczone: {meta.get('min_employees_calculated', '?')}, kierowników: {supervisors})")
    print(f"   Szablony: {len(scenario['shift_templates'])}")
    for t in scenario['shift_templates']:
        print(f"      - {t['name']} ({t['start_time']}-{t['end_time']}) [min:{t['min_employees']}, max:{t['max_employees']}]")
    
    # Wyślij request
    print(f"\nGenerowanie grafiku...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/generate",
            headers=HEADERS,
            json=scenario,
            timeout=180
        )
        
        if response.status_code != 200:
            print(f"[FAIL] Blad API: {response.status_code}")
            print(response.text[:500])
            return False
        
        result = response.json()
        
    except Exception as e:
        print(f"[FAIL] Blad: {e}")
        return False
    
    # Walidacja
    summary = validate_schedule(scenario, result)
    
    # ========== PODSUMOWANIE ==========
    print("\n" + "="*70)
    print("  PODSUMOWANIE")
    print("="*70)
    
    stats = summary.get('stats', {})
    print(f"\nStatystyki solvera:")
    print(f"   Status: {stats.get('solver_status')}")
    print(f"   Zmiany: {stats.get('total_shifts')}")
    print(f"   Czas: {stats.get('solve_time', 0):.2f}s")
    print(f"   Jakość: {stats.get('quality_score', 0)}%")
    
    if summary['passed']:
        print(f"\n[PASS] ZALICZONE ({len(summary['passed'])}):")
        for msg in summary['passed']:
            print(f"   + {msg}")
    
    if summary['warnings']:
        print(f"\n[WARN] OSTRZEZENIA ({len(summary['warnings'])}):")
        for msg in summary['warnings'][:5]:  # Max 5
            print(f"   ~ {msg}")
        if len(summary['warnings']) > 5:
            print(f"   ... i {len(summary['warnings']) - 5} więcej")
    
    if summary['failed']:
        print(f"\n[FAIL] BLEDY ({len(summary['failed'])}):")
        for msg in summary['failed']:
            print(f"   X {msg}")
    
    # Wynik końcowy
    print("\n" + "-"*70)
    if not summary['failed']:
        print(">>> TEST ZALICZONY!")
        return True
    else:
        print(f">>> TEST NIEZALICZONY ({len(summary['failed'])} bledow)")
        print(f"   Seed do reprodukcji: {seed}")
        return False


if __name__ == "__main__":
    import sys
    # Obsługa argumentu seed
    seed = None
    if len(sys.argv) > 1:
        try:
            seed = int(sys.argv[1])
        except ValueError:
            print(f"Nieprawidłowy seed: {sys.argv[1]}")
            sys.exit(1)
    
    success = main(seed)
    sys.exit(0 if success else 1)
