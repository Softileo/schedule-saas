"""
Test script dla Python Scheduler API

Testuje wszystkie endpointy lokalnie lub na Cloud Run
"""

import json
import requests
from datetime import datetime, timedelta

# =============================================================================
# KONFIGURACJA
# =============================================================================

# Zmień na URL Cloud Run po deploymencie
BASE_URL = "https://python-scheduler-155306113106.europe-west1.run.app"
API_KEY = "schedule-saas-production-2026"

HEADERS = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

# =============================================================================
# PRZYKŁADOWE DANE
# =============================================================================

def get_test_data():
    """Generuje przykładowe dane testowe"""
    
    # Pracownicy
    employees = [
        {
            "id": "emp-1",
            "name": "Jan Kowalski",
            "email": "jan@example.com",
            "contract_type": "full_time",
            "weekly_hours": 40.0,
            "max_hours": 48.0,
            "template_assignments": ["tmpl-1", "tmpl-2"],
            "preferences": None,
            "absences": []
        },
        {
            "id": "emp-2",
            "name": "Anna Nowak",
            "email": "anna@example.com",
            "contract_type": "full_time",
            "weekly_hours": 40.0,
            "max_hours": 48.0,
            "template_assignments": ["tmpl-1", "tmpl-3"],
            "preferences": None,
            "absences": []
        }
    ]
    
    # Szablony zmian
    templates = [
        {
            "id": "tmpl-1",
            "name": "Rano",
            "start_time": "08:00",
            "end_time": "16:00",
            "break_minutes": 30,
            "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "is_weekend": False
        },
        {
            "id": "tmpl-2",
            "name": "Popołudnie",
            "start_time": "14:00",
            "end_time": "22:00",
            "break_minutes": 30,
            "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "is_weekend": False
        },
        {
            "id": "tmpl-3",
            "name": "Weekend",
            "start_time": "10:00",
            "end_time": "18:00",
            "break_minutes": 30,
            "days_of_week": ["saturday", "sunday"],
            "is_weekend": True
        }
    ]
    
    # Ustawienia
    settings = {
        "work_days_per_week": 5,
        "enforce_daily_rest": True,
        "enforce_weekly_rest": True,
        "max_consecutive_work_days": 6,
        "min_staff_per_shift": 1,
        "max_sunday_shifts_per_month": 2,
        "balance_shift_distribution": True
    }
    
    # Przykładowe zmiany
    shifts = [
        {
            "employee_id": "emp-1",
            "date": "2026-02-02",
            "start_time": "08:00",
            "end_time": "16:00",
            "break_minutes": 30,
            "template_id": "tmpl-1"
        },
        {
            "employee_id": "emp-2",
            "date": "2026-02-02",
            "start_time": "14:00",
            "end_time": "22:00",
            "break_minutes": 30,
            "template_id": "tmpl-2"
        },
        {
            "employee_id": "emp-1",
            "date": "2026-02-03",
            "start_time": "08:00",
            "end_time": "16:00",
            "break_minutes": 30,
            "template_id": "tmpl-1"
        },
        {
            "employee_id": "emp-2",
            "date": "2026-02-03",
            "start_time": "14:00",
            "end_time": "22:00",
            "break_minutes": 30,
            "template_id": "tmpl-2"
        }
    ]
    
    # Input dla schedulera
    scheduler_input = {
        "year": 2026,
        "month": 2,
        "employees": employees,
        "templates": templates,
        "settings": settings,
        "holidays": [],
        "work_days": ["2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05", "2026-02-06"],
        "saturday_days": ["2026-02-07"],
        "trading_sundays": []
    }
    
    return shifts, scheduler_input

# =============================================================================
# TESTY
# =============================================================================

def test_health():
    """Test health check"""
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/health")
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    
    print("✅ Health check PASSED")

def test_evaluate():
    """Test evaluate endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Evaluate Schedule")
    print("="*60)
    
    shifts, scheduler_input = get_test_data()
    
    payload = {
        "shifts": shifts,
        "input": scheduler_input
    }
    
    response = requests.post(
        f"{BASE_URL}/api/evaluate",
        headers=HEADERS,
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data['success']}")
        if data['success']:
            metrics = data['data']
            print(f"\nMetrics:")
            print(f"  - Fitness: {metrics['fitness']:.2f}")
            print(f"  - Hours Balance: {metrics['hours_balance']:.2f}")
            print(f"  - Shift Balance: {metrics['shift_balance']:.2f}")
            print(f"  - Labor Code Score: {metrics['labor_code_score']:.2f}")
    else:
        print(f"Error: {response.text}")
    
    assert response.status_code == 200
    print("✅ Evaluate PASSED")

def test_validate():
    """Test validate endpoint"""
    print("\n" + "="*60)
    print("TEST 3: Validate Schedule")
    print("="*60)
    
    shifts, scheduler_input = get_test_data()
    
    payload = {
        "shifts": shifts,
        "input": scheduler_input
    }
    
    response = requests.post(
        f"{BASE_URL}/api/validate",
        headers=HEADERS,
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data['success']}")
        if data['success']:
            result = data['data']
            print(f"\nValidation Result:")
            print(f"  - Valid: {result['isValid']}")
            print(f"  - Violations: {len(result['violations'])}")
            
            if result['violations']:
                print("\n  Violations:")
                for v in result['violations']:
                    print(f"    - {v['rule']}: {v['description']}")
    else:
        print(f"Error: {response.text}")
    
    assert response.status_code == 200
    print("✅ Validate PASSED")

def test_optimize():
    """Test optimize endpoint"""
    print("\n" + "="*60)
    print("TEST 4: Optimize Schedule")
    print("="*60)
    
    shifts, scheduler_input = get_test_data()
    
    payload = {
        "shifts": shifts,
        "input": scheduler_input,
        "config": {
            "populationSize": 10,
            "generations": 20,
            "mutationRate": 0.2,
            "crossoverRate": 0.7,
            "timeoutMs": 3000
        }
    }
    
    print("Optimizing... (to może potrwać kilka sekund)")
    
    response = requests.post(
        f"{BASE_URL}/api/optimize",
        headers=HEADERS,
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data['success']}")
        if data['success']:
            result = data['data']
            improvement = result['improvement']
            
            print(f"\nOptimization Result:")
            print(f"  - Initial Fitness: {improvement['initial']['fitness']:.2f}")
            print(f"  - Final Fitness: {improvement['final']['fitness']:.2f}")
            print(f"  - Improvement: {improvement['improvementPercent']:.2f}%")
            print(f"  - Shifts Count: {len(result['shifts'])}")
    else:
        print(f"Error: {response.text}")
    
    assert response.status_code == 200
    print("✅ Optimize PASSED")

# =============================================================================
# MAIN
# =============================================================================

def main():
    """Uruchamia wszystkie testy"""
    print("\n🧪 Python Scheduler API Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"API Key: {'*' * len(API_KEY)}")
    
    try:
        test_health()
        test_evaluate()
        test_validate()
        test_optimize()
        
        print("\n" + "="*60)
        print("✅ WSZYSTKIE TESTY PRZESZŁY POMYŚLNIE!")
        print("="*60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Nie można połączyć się z {BASE_URL}")
        print("Upewnij się, że serwis działa (python main.py)")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")

if __name__ == "__main__":
    main()
