"""
Test CP-SAT Optimizer - 3 Kompleksowe Scenariusze
Testuje różne konfiguracje grafików pracy
"""

import requests
import json
from datetime import datetime, date, timedelta
from typing import Dict, List
import time

# Configuration
BASE_URL = "http://localhost:8080"
API_KEY = "schedule-saas-local-dev-2026"

HEADERS = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}


def print_header(title: str):
    """Print formatted header."""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")


def check_health():
    """Check if Python Scheduler is running."""
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
        return False


def test_scenario_1_simple_retail():
    """
    SCENARIUSZ 1: Prosty sklep - 5 pracowników, 2 zmiany dziennie
    Sklep otwarty Pn-Pt 8:00-20:00
    """
    print_header("SCENARIUSZ 1: Prosty Sklep Detaliczny")
    
    input_data = {
        "year": 2026,
        "month": 2,
        "organization_settings": {
            "store_open_time": "08:00:00",
            "store_close_time": "20:00:00",
            "min_employees_per_shift": 2,
            "enable_trading_sundays": False
        },
        "shift_templates": [
            {
                "id": "morning-shift",
                "name": "Poranna (8-16)",
                "start_time": "08:00:00",
                "end_time": "16:00:00",
                "break_minutes": 30,
                "min_employees": 2,
                "max_employees": 3,
                "color": "#FF6B6B",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
            },
            {
                "id": "afternoon-shift",
                "name": "Popołudniowa (12-20)",
                "start_time": "12:00:00",
                "end_time": "20:00:00",
                "break_minutes": 30,
                "min_employees": 2,
                "max_employees": 3,
                "color": "#4ECDC4",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
            }
        ],
        "employees": [
            {
                "id": "emp-1",
                "first_name": "Anna",
                "last_name": "Manager",
                "position": "Store Manager",
                "employment_type": "full",
                "is_active": True,
                "color": "#FF6B6B"
            },
            {
                "id": "emp-2",
                "first_name": "Jan",
                "last_name": "Kowalski",
                "position": "Sprzedawca",
                "employment_type": "full",
                "is_active": True,
                "color": "#4ECDC4"
            },
            {
                "id": "emp-3",
                "first_name": "Maria",
                "last_name": "Nowak",
                "position": "Sprzedawca",
                "employment_type": "full",
                "is_active": True,
                "color": "#95E1D3"
            },
            {
                "id": "emp-4",
                "first_name": "Piotr",
                "last_name": "Wiśniewski",
                "position": "Sprzedawca",
                "employment_type": "half",
                "is_active": True,
                "color": "#F38181"
            },
            {
                "id": "emp-5",
                "first_name": "Zofia",
                "last_name": "Kamińska",
                "position": "Sprzedawca",
                "employment_type": "three_quarter",
                "is_active": True,
                "color": "#AA96DA"
            }
        ],
        "employee_preferences": [
            {
                "employee_id": "emp-1",
                "preferred_start_time": "08:00:00",
                "max_hours_per_week": 40,
                "can_work_weekends": True,
                "preferred_days": [0, 1, 2, 3, 4]
            },
            {
                "employee_id": "emp-2",
                "preferred_start_time": "08:00:00",
                "max_hours_per_week": 40,
                "can_work_weekends": True,
                "preferred_days": [0, 1, 2, 3, 4]
            },
            {
                "employee_id": "emp-4",
                "preferred_start_time": "12:00:00",
                "max_hours_per_week": 20,
                "can_work_weekends": False,
                "preferred_days": [0, 1, 2]
            }
        ],
        "employee_absences": [
            {
                "employee_id": "emp-3",
                "start_date": "2026-02-09",
                "end_date": "2026-02-13",
                "absence_type": "vacation"
            }
        ],
        "scheduling_rules": {
            "max_consecutive_days": 6,
            "min_daily_rest_hours": 11,
            "max_weekly_work_hours": 48
        },
        "trading_sundays": [],
        "solver_time_limit": 180
    }
    
    return test_generation("Scenariusz 1", input_data)


def test_scenario_2_clinic_complex():
    """
    SCENARIUSZ 2: Klinika - 8 pracowników, 3 zmiany, 7 dni w tygodniu
    Praca w weekendy, różne preferencje
    """
    print_header("SCENARIUSZ 2: Klinika Medyczna (24/5)")
    
    input_data = {
        "year": 2026,
        "month": 2,
        "organization_settings": {
            "store_open_time": "06:00:00",
            "store_close_time": "22:00:00",
            "min_employees_per_shift": 3,
            "enable_trading_sundays": True
        },
        "shift_templates": [
            {
                "id": "shift-morning",
                "name": "Ranna (6-14)",
                "start_time": "06:00:00",
                "end_time": "14:00:00",
                "break_minutes": 30,
                "min_employees": 2,
                "max_employees": 4,
                "color": "#FFD93D",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            },
            {
                "id": "shift-day",
                "name": "Dzienna (10-18)",
                "start_time": "10:00:00",
                "end_time": "18:00:00",
                "break_minutes": 30,
                "min_employees": 2,
                "max_employees": 5,
                "color": "#6BCB77",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            },
            {
                "id": "shift-evening",
                "name": "Popołudniowa (14-22)",
                "start_time": "14:00:00",
                "end_time": "22:00:00",
                "break_minutes": 30,
                "min_employees": 2,
                "max_employees": 3,
                "color": "#4D96FF",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            }
        ],
        "employees": [
            {
                "id": "doc-1",
                "first_name": "Dr Adam",
                "last_name": "Kierownik",
                "position": "Senior Manager Doctor",
                "employment_type": "full",
                "is_active": True,
                "color": "#FFD93D"
            },
            {
                "id": "doc-2",
                "first_name": "Dr Barbara",
                "last_name": "Kowal",
                "position": "Doctor",
                "employment_type": "full",
                "is_active": True,
                "color": "#6BCB77"
            },
            {
                "id": "nurse-1",
                "first_name": "Ewa",
                "last_name": "Pielęgniarka",
                "position": "Nurse",
                "employment_type": "full",
                "is_active": True,
                "color": "#4D96FF"
            },
            {
                "id": "nurse-2",
                "first_name": "Filip",
                "last_name": "Nowicki",
                "position": "Nurse",
                "employment_type": "full",
                "is_active": True,
                "color": "#FF6B9D"
            },
            {
                "id": "nurse-3",
                "first_name": "Gabriela",
                "last_name": "Zając",
                "position": "Nurse",
                "employment_type": "three_quarter",
                "is_active": True,
                "color": "#C44569"
            },
            {
                "id": "assist-1",
                "first_name": "Hubert",
                "last_name": "Asystent",
                "position": "Medical Assistant",
                "employment_type": "half",
                "is_active": True,
                "color": "#786FA6"
            },
            {
                "id": "assist-2",
                "first_name": "Irena",
                "last_name": "Pomocnik",
                "position": "Medical Assistant",
                "employment_type": "half",
                "is_active": True,
                "color": "#F8B500"
            },
            {
                "id": "admin-1",
                "first_name": "Janusz",
                "last_name": "Recepcja",
                "position": "Administrator",
                "employment_type": "full",
                "is_active": True,
                "color": "#58B19F"
            }
        ],
        "employee_preferences": [
            {
                "employee_id": "doc-1",
                "preferred_start_time": "10:00:00",
                "max_hours_per_week": 45,
                "can_work_weekends": True,
                "preferred_days": [0, 1, 2, 3, 4]
            },
            {
                "employee_id": "nurse-3",
                "preferred_start_time": "06:00:00",
                "max_hours_per_week": 30,
                "can_work_weekends": False,
                "preferred_days": [0, 1, 2, 3]
            },
            {
                "employee_id": "assist-1",
                "preferred_start_time": "14:00:00",
                "max_hours_per_week": 20,
                "can_work_weekends": True,
                "preferred_days": [4, 5]
            }
        ],
        "employee_absences": [
            {
                "employee_id": "doc-2",
                "start_date": "2026-02-16",
                "end_date": "2026-02-20",
                "absence_type": "training"
            },
            {
                "employee_id": "nurse-2",
                "start_date": "2026-02-02",
                "end_date": "2026-02-06",
                "absence_type": "vacation"
            }
        ],
        "scheduling_rules": {
            "max_consecutive_days": 5,
            "min_daily_rest_hours": 11,
            "max_weekly_work_hours": 48
        },
        "trading_sundays": [
            {"date": "2026-02-01", "is_active": True},
            {"date": "2026-02-08", "is_active": True},
            {"date": "2026-02-15", "is_active": True},
            {"date": "2026-02-22", "is_active": True}
        ],
        "solver_time_limit": 240
    }
    
    return test_generation("Scenariusz 2", input_data)


def test_scenario_3_restaurant_night():
    """
    SCENARIUSZ 3: Restauracja - zmiany przez północ, niedziele handlowe
    12 pracowników, 4 zmiany, praca 7 dni w tygodniu
    """
    print_header("SCENARIUSZ 3: Restauracja (Zmiany przez północ)")
    
    input_data = {
        "year": 2026,
        "month": 2,
        "organization_settings": {
            "store_open_time": "10:00:00",
            "store_close_time": "02:00:00",
            "min_employees_per_shift": 4,
            "enable_trading_sundays": True
        },
        "shift_templates": [
            {
                "id": "lunch-shift",
                "name": "Lunch (10-16)",
                "start_time": "10:00:00",
                "end_time": "16:00:00",
                "break_minutes": 30,
                "min_employees": 3,
                "max_employees": 6,
                "color": "#F9A825",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            },
            {
                "id": "afternoon-shift",
                "name": "Popołudnie (14-22)",
                "start_time": "14:00:00",
                "end_time": "22:00:00",
                "break_minutes": 30,
                "min_employees": 3,
                "max_employees": 7,
                "color": "#E65100",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            },
            {
                "id": "evening-shift",
                "name": "Wieczór (18-02)",
                "start_time": "18:00:00",
                "end_time": "02:00:00",
                "break_minutes": 30,
                "min_employees": 3,
                "max_employees": 6,
                "color": "#6A1B9A",
                "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            },
            {
                "id": "night-shift",
                "name": "Noc (22-06)",
                "start_time": "22:00:00",
                "end_time": "06:00:00",
                "break_minutes": 45,
                "min_employees": 2,
                "max_employees": 3,
                "color": "#1A237E",
                "applicable_days": ["friday", "saturday"]
            }
        ],
        "employees": [
            {
                "id": "chef-1",
                "first_name": "Tomasz",
                "last_name": "Szef Kuchni",
                "position": "Head Chef Manager",
                "employment_type": "full",
                "is_active": True,
                "color": "#F9A825"
            },
            {
                "id": "chef-2",
                "first_name": "Katarzyna",
                "last_name": "Kucharz",
                "position": "Chef",
                "employment_type": "full",
                "is_active": True,
                "color": "#E65100"
            },
            {
                "id": "chef-3",
                "first_name": "Michał",
                "last_name": "Kucharz",
                "position": "Chef",
                "employment_type": "full",
                "is_active": True,
                "color": "#6A1B9A"
            },
            {
                "id": "waiter-1",
                "first_name": "Laura",
                "last_name": "Kelnerka",
                "position": "Senior Waiter",
                "employment_type": "full",
                "is_active": True,
                "color": "#388E3C"
            },
            {
                "id": "waiter-2",
                "first_name": "Marcin",
                "last_name": "Kelner",
                "position": "Waiter",
                "employment_type": "full",
                "is_active": True,
                "color": "#00796B"
            },
            {
                "id": "waiter-3",
                "first_name": "Natalia",
                "last_name": "Kelnerka",
                "position": "Waiter",
                "employment_type": "three_quarter",
                "is_active": True,
                "color": "#0097A7"
            },
            {
                "id": "waiter-4",
                "first_name": "Oskar",
                "last_name": "Kelner",
                "position": "Waiter",
                "employment_type": "half",
                "is_active": True,
                "color": "#0288D1"
            },
            {
                "id": "barman-1",
                "first_name": "Paulina",
                "last_name": "Barman",
                "position": "Senior Bartender Manager",
                "employment_type": "full",
                "is_active": True,
                "color": "#C2185B"
            },
            {
                "id": "barman-2",
                "first_name": "Robert",
                "last_name": "Barman",
                "position": "Bartender",
                "employment_type": "full",
                "is_active": True,
                "color": "#7B1FA2"
            },
            {
                "id": "dish-1",
                "first_name": "Sandra",
                "last_name": "Zmywak",
                "position": "Dishwasher",
                "employment_type": "half",
                "is_active": True,
                "color": "#455A64"
            },
            {
                "id": "dish-2",
                "first_name": "Tadeusz",
                "last_name": "Zmywak",
                "position": "Dishwasher",
                "employment_type": "half",
                "is_active": True,
                "color": "#546E7A"
            },
            {
                "id": "host-1",
                "first_name": "Urszula",
                "last_name": "Hostessa",
                "position": "Host Manager",
                "employment_type": "full",
                "is_active": True,
                "color": "#D32F2F"
            }
        ],
        "employee_preferences": [
            {
                "employee_id": "chef-1",
                "preferred_start_time": "14:00:00",
                "max_hours_per_week": 45,
                "can_work_weekends": True,
                "preferred_days": [0, 1, 2, 3, 4, 5]
            },
            {
                "employee_id": "waiter-3",
                "preferred_start_time": "10:00:00",
                "max_hours_per_week": 30,
                "can_work_weekends": True,
                "preferred_days": [4, 5, 6]
            },
            {
                "employee_id": "waiter-4",
                "preferred_start_time": "18:00:00",
                "max_hours_per_week": 20,
                "can_work_weekends": True,
                "preferred_days": [4, 5, 6]
            },
            {
                "employee_id": "barman-2",
                "preferred_start_time": "18:00:00",
                "max_hours_per_week": 40,
                "can_work_weekends": True,
                "preferred_days": [3, 4, 5, 6]
            }
        ],
        "employee_absences": [
            {
                "employee_id": "chef-2",
                "start_date": "2026-02-23",
                "end_date": "2026-02-28",
                "absence_type": "vacation"
            },
            {
                "employee_id": "waiter-2",
                "start_date": "2026-02-05",
                "end_date": "2026-02-07",
                "absence_type": "sick_leave"
            },
            {
                "employee_id": "dish-1",
                "start_date": "2026-02-14",
                "end_date": "2026-02-14",
                "absence_type": "other"
            }
        ],
        "scheduling_rules": {
            "max_consecutive_days": 6,
            "min_daily_rest_hours": 11,
            "max_weekly_work_hours": 48
        },
        "trading_sundays": [
            {"date": "2026-02-01", "is_active": True},
            {"date": "2026-02-08", "is_active": True},
            {"date": "2026-02-15", "is_active": True},
            {"date": "2026-02-22", "is_active": True}
        ],
        "solver_time_limit": 300
    }
    
    return test_generation("Scenariusz 3", input_data)


def test_generation(scenario_name: str, input_data: Dict) -> Dict:
    """Execute generation test."""
    print(f"📊 Testing: {scenario_name}")
    print(f"   Year/Month: {input_data['year']}-{input_data['month']:02d}")
    print(f"   Employees: {len(input_data['employees'])}")
    print(f"   Shift Templates: {len(input_data['shift_templates'])}")
    print(f"   Absences: {len(input_data.get('employee_absences', []))}")
    print(f"   Time Limit: {input_data.get('solver_time_limit', 300)}s")
    print()
    
    try:
        # Send request
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/generate",
            headers=HEADERS,
            json=input_data,
            timeout=input_data.get('solver_time_limit', 300) + 30
        )
        elapsed = time.time() - start_time
        
        print(f"⏱️  Request completed in {elapsed:.2f}s")
        print(f"📡 HTTP Status: {response.status_code}")
        
        # Parse response
        result = response.json()
        
        # Display results
        print()
        
        # Handle both response formats (direct CP-SAT and Next.js wrapper)
        if 'data' in result:
            # Next.js format: {success: true, data: {shifts: [...]}}
            status = result.get('status') or ('SUCCESS' if result.get('success') else 'ERROR')
            shifts = result.get('data', {}).get('shifts', [])
            stats = result.get('statistics', {})
        else:
            # Direct CP-SAT format: {status: 'SUCCESS', shifts: [...]}
            status = result.get('status')
            shifts = result.get('shifts', [])
            stats = result.get('statistics', {})
        
        print(f"🎯 Status: {status}")
        
        if status == 'SUCCESS':
            print(f"✅ SUKCES!")
            print(f"   • Wygenerowano zmian: {len(shifts)}")
            print(f"   • Czas solvera: {stats.get('solve_time_seconds', 0):.2f}s")
            print(f"   • Wartość funkcji celu: {stats.get('objective_value', 'N/A')}")
            print(f"   • Zmiennych decyzyjnych: {stats.get('total_variables', 0)}")
            print(f"   • Ograniczeń twardych: {stats.get('hard_constraints', 0)}")
            
            # Analiza pokrycia pracowników
            employee_shifts = {}
            for shift in shifts:
                emp_id = shift['employee_id']
                employee_shifts[emp_id] = employee_shifts.get(emp_id, 0) + 1
            
            print(f"\n   📈 Rozkład zmian na pracownika:")
            for emp in input_data['employees']:
                emp_id = emp['id']
                count = employee_shifts.get(emp_id, 0)
                name = f"{emp['first_name']} {emp['last_name']}"
                print(f"      • {name:30s}: {count:2d} zmian")
            
            # Sample shifts
            print(f"\n   📅 Przykładowe zmiany (pierwsze 5):")
            for shift in shifts[:5]:
                print(f"      • {shift['date']}: {shift['employee_name']} - {shift['template_name']} ({shift['start_time']}-{shift['end_time']})")
            
            return {
                'success': True,
                'scenario': scenario_name,
                'shifts_count': len(shifts),
                'statistics': stats
            }
        
        elif status == 'INFEASIBLE':
            print(f"❌ NIEMOŻLIWE DO ROZWIĄZANIA")
            reasons = result.get('reasons', [])
            print(f"\n   Przyczyny:")
            for reason in reasons:
                print(f"      • {reason}")
            
            suggestions = result.get('suggestions', [])
            if suggestions:
                print(f"\n   Sugestie:")
                for suggestion in suggestions:
                    print(f"      • {suggestion}")
            
            return {
                'success': False,
                'scenario': scenario_name,
                'error': 'INFEASIBLE',
                'reasons': reasons
            }
        
        else:
            print(f"❌ BŁĄD: {result.get('error', 'Unknown error')}")
            return {
                'success': False,
                'scenario': scenario_name,
                'error': result.get('error')
            }
    
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'scenario': scenario_name,
            'error': str(e)
        }


def main():
    """Main test execution."""
    print_header("🚀 CP-SAT OPTIMIZER - COMPREHENSIVE TEST SUITE")
    
    # Health check
    print("🔍 Checking Python Scheduler availability...")
    if not check_health():
        print("\n❌ Python Scheduler is not running!")
        print("   Start it with: docker-compose up -d python-scheduler")
        return
    
    print("\n✅ Python Scheduler is ready!\n")
    time.sleep(1)
    
    # Run tests
    results = []
    
    # Scenario 1
    result1 = test_scenario_1_simple_retail()
    results.append(result1)
    time.sleep(2)
    
    # Scenario 2
    result2 = test_scenario_2_clinic_complex()
    results.append(result2)
    time.sleep(2)
    
    # Scenario 3
    result3 = test_scenario_3_restaurant_night()
    results.append(result3)
    
    # Summary
    print_header("📊 PODSUMOWANIE TESTÓW")
    
    successful = sum(1 for r in results if r.get('success'))
    total = len(results)
    
    print(f"Pomyślnych testów: {successful}/{total}\n")
    
    for i, result in enumerate(results, 1):
        status = "✅ PASS" if result.get('success') else "❌ FAIL"
        scenario = result.get('scenario', f'Test {i}')
        print(f"{status} - {scenario}")
        
        if result.get('success'):
            shifts = result.get('shifts_count', 0)
            stats = result.get('statistics', {})
            solve_time = stats.get('solve_time_seconds', 0)
            print(f"         Shifts: {shifts}, Solve time: {solve_time:.2f}s")
        else:
            error = result.get('error', 'Unknown')
            print(f"         Error: {error}")
    
    print()
    print("="*80)
    
    if successful == total:
        print("🎉 WSZYSTKIE TESTY ZAKOŃCZONE SUKCESEM!")
    else:
        print(f"⚠️  {total - successful} test(ów) nie powiodło się")
    
    print("="*80)


if __name__ == "__main__":
    main()
