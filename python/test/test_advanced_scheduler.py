"""
================================================================================
TEST GENERATORA GRAFIKÓW CP-SAT - Szybki test losowego scenariusza
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

FIRST_NAMES = ["Anna", "Jan", "Maria", "Piotr", "Katarzyna", "Tomasz", "Michał", "Ewa"]
LAST_NAMES = ["Nowak", "Kowalski", "Wiśniewski", "Dąbrowski", "Lewandowski", "Zieliński"]
COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"]


# ============================================================================
# GENERATOR SCENARIUSZA
# ============================================================================

def generate_scenario(year: int = 2026, month: int = 2, num_employees: int = 8) -> dict:
    """Generuje losowy scenariusz testowy."""
    days_in_month = calendar.monthrange(year, month)[1]
    
    # Oblicz dni robocze (Pn-Pt)
    work_days = sum(1 for d in range(1, days_in_month + 1) 
                    if date(year, month, d).weekday() < 5)
    monthly_norm = work_days * 8
    
    # Generuj pracowników
    employees = []
    used_names = set()
    emp_types = ['full'] * 6 + ['half'] * 2 + ['three_quarter'] * 2
    
    for i in range(num_employees):
        while True:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            if name not in used_names:
                used_names.add(name)
                break
        
        emp_type = random.choice(emp_types)
        multiplier = {'full': 1.0, 'half': 0.5, 'three_quarter': 0.75}.get(emp_type, 1.0)
        
        employees.append({
            'id': str(uuid.uuid4()),
            'first_name': name.split()[0],
            'last_name': name.split()[1],
            'employment_type': emp_type,
            'max_hours': int(monthly_norm * multiplier),
            'is_active': True,
            'color': random.choice(COLORS)
        })
    
    # Szablony zmian - losowe godziny
    hours_options = [
        ('06:00', '14:00', 'Poranna 8h'),
        ('08:00', '16:00', 'Dzienna 8h'),
        ('14:00', '22:00', 'Popołudniowa 8h'),
        ('10:00', '18:00', 'Środkowa 8h'),
        ('19:00', '07:00', 'Nocna 12h'),  # Zmiana nocna!
        ('00:00', '00:00', 'Pełna doba 24h'),  # Test 24h
    ]
    
    # Wybierz 2-3 szablony
    selected = random.sample(hours_options, min(3, len(hours_options)))
    
    templates = []
    for start, end, name in selected:
        templates.append({
            'id': str(uuid.uuid4()),
            'name': name,
            'start_time': start,
            'end_time': end,
            'min_employees': random.randint(0, 2),
            'max_employees': random.randint(3, 5),
            'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            'color': random.choice(COLORS)
        })
    
    return {
        'year': year,
        'month': month,
        'monthly_hours_norm': monthly_norm,
        'organization_settings': {
            'store_open_time': '06:00',
            'store_close_time': '22:00',
            'min_employees_per_shift': 1,
            'enable_trading_sundays': False
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
        'trading_sundays': [],
        'solver_time_limit': 60
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
    
    # ========== R1: Sprawdź godziny pracowników ==========
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
                    
                    # Obsługa 24:00 i 00:00 jako end_time = koniec dnia
                    if end == 0:
                        end = 1440  # 24h
                    
                    # Obsługa zmiany nocnej (przez północ)
                    if end <= start:
                        end += 24 * 60
                    
                    actual_hours += (end - start) / 60
        
        emp_name = f"{emp['first_name']} {emp['last_name']}"
        
        if actual_hours > max_hours + 8:  # +8h bufor nadgodzin
            summary['failed'].append(f"R1: {emp_name} przekroczył limit: {actual_hours:.0f}h > {max_hours}h")
        elif actual_hours < max_hours * 0.5:
            summary['warnings'].append(f"R1: {emp_name} ma mało godzin: {actual_hours:.0f}h / {max_hours}h")
        else:
            summary['passed'].append(f"R1: {emp_name} OK ({actual_hours:.0f}h / {max_hours}h)")
    
    # ========== R2: Sprawdź pokrycie dni roboczych ==========
    uncovered = 0
    for day in range(1, days_in_month + 1):
        d = date(year, month, day)
        if d.weekday() >= 5:  # Weekend
            continue
        
        day_str = d.strftime('%Y-%m-%d')
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
        summary['passed'].append("R3: Max 1 zmiana/dzień - OK")
    else:
        summary['failed'].append(f"R3: {double_shifts} przypadków > 1 zmiany/dzień")
    
    # ========== R4: Sprawdź niedziele ==========
    sunday_shifts = 0
    for day in range(1, days_in_month + 1):
        d = date(year, month, day)
        if d.weekday() != 6:
            continue
        
        day_str = d.strftime('%Y-%m-%d')
        for emp_schedule in schedule.values():
            if day_str in emp_schedule:
                sunday_shifts += len(emp_schedule[day_str])
    
    trading_sundays = scenario.get('trading_sundays', [])
    if sunday_shifts == 0 and not trading_sundays:
        summary['passed'].append("R4: Brak zmian w niedziele (poprawnie)")
    elif sunday_shifts > 0 and not trading_sundays:
        summary['failed'].append(f"R4: {sunday_shifts} zmian w niedziele niehandlowe!")
    
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

def main():
    print("\n" + "="*70)
    print("  TEST GENERATORA GRAFIKÓW CP-SAT")
    print("="*70)
    
    # Health check
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code != 200:
            print("❌ Scheduler niedostępny!")
            return False
        print(f"✅ Scheduler OK (v{r.json().get('version', '?')})")
    except Exception as e:
        print(f"❌ Nie można połączyć z {BASE_URL}: {e}")
        return False
    
    # Generuj losowy scenariusz
    seed = random.randint(1, 999999)
    random.seed(seed)
    print(f"\n🌱 Seed: {seed}")
    
    num_emp = random.randint(6, 12)
    scenario = generate_scenario(num_employees=num_emp)
    
    print(f"\n📋 Scenariusz:")
    print(f"   Miesiąc: {scenario['month']}/{scenario['year']}")
    print(f"   Pracownicy: {len(scenario['employees'])}")
    print(f"   Szablony: {len(scenario['shift_templates'])}")
    for t in scenario['shift_templates']:
        print(f"      - {t['name']} ({t['start_time']}-{t['end_time']})")
    
    # Wyślij request
    print(f"\n🚀 Generowanie grafiku...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/generate",
            headers=HEADERS,
            json=scenario,
            timeout=120
        )
        
        if response.status_code != 200:
            print(f"❌ Błąd API: {response.status_code}")
            print(response.text[:500])
            return False
        
        result = response.json()
        
    except Exception as e:
        print(f"❌ Błąd: {e}")
        return False
    
    # Walidacja
    summary = validate_schedule(scenario, result)
    
    # ========== PODSUMOWANIE ==========
    print("\n" + "="*70)
    print("  PODSUMOWANIE")
    print("="*70)
    
    stats = summary.get('stats', {})
    print(f"\n📊 Statystyki:")
    print(f"   Status: {stats.get('solver_status')}")
    print(f"   Zmiany: {stats.get('total_shifts')}")
    print(f"   Czas: {stats.get('solve_time', 0):.2f}s")
    print(f"   Jakość: {stats.get('quality_score', 0)}%")
    
    if summary['passed']:
        print(f"\n✅ CO DZIAŁA ({len(summary['passed'])}):")
        for msg in summary['passed']:
            print(f"   ✓ {msg}")
    
    if summary['warnings']:
        print(f"\n⚠️  OSTRZEŻENIA ({len(summary['warnings'])}):")
        for msg in summary['warnings']:
            print(f"   ⚠ {msg}")
    
    if summary['failed']:
        print(f"\n❌ BŁĘDY ({len(summary['failed'])}):")
        for msg in summary['failed']:
            print(f"   ✗ {msg}")
    
    # Wynik końcowy
    print("\n" + "-"*70)
    if not summary['failed']:
        print("🎉 TEST ZALICZONY!")
        return True
    else:
        print(f"💥 TEST NIEZALICZONY ({len(summary['failed'])} błędów)")
        return False


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
