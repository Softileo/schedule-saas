#!/usr/bin/env python3
"""
Test: Next.js format z pustą listą tradingSundays
To był przypadek, który powodował INFEASIBLE przed naprawą
"""

import requests
import json

test_data = {
    "input": {
        "year": 2026,
        "month": 2,
        "employees": [
            {
                "id": "emp-1",
                "first_name": "Jan",
                "last_name": "Kowalski",
                "email": "jan@test.pl",
                "employment_type": "full",
                "custom_hours": None,
                "preferences": None,
                "absences": []
            },
            {
                "id": "emp-2", 
                "first_name": "Anna",
                "last_name": "Nowak",
                "email": "anna@test.pl",
                "employment_type": "full",
                "custom_hours": None,
                "preferences": None,
                "absences": []
            }
        ],
        "templates": [
            {
                "id": "tmpl-1",
                "name": "Poranna",
                "start_time": "08:00",
                "end_time": "16:00",
                "break_minutes": 30,
                "min_employees": 1,
                "max_employees": 2,
                "applicable_days": None,  # null = wszystkie dni (w tym niedziela!)
                "color": "#3b82f6"
            }
        ],
        "settings": {
            "min_staff_per_shift": 1,
            "max_consecutive_work_days": 6
        },
        "holidays": [],
        "workDays": [],
        "saturdayDays": [],
        "tradingSundays": []  # PUSTA LISTA - brak niedziel handlowych!
    },
    "config": {
        "timeout_ms": 60000
    }
}

print("=" * 60)
print("TEST: Next.js format z tradingSundays = []")
print("=" * 60)
print()

response = requests.post(
    "http://localhost:8080/api/generate",
    json=test_data,
    headers={"X-API-Key": "schedule-saas-local-dev-2026"}
)

print(f"Status HTTP: {response.status_code}")
result = response.json()

if response.status_code == 200:
    if result.get("success"):
        shifts = result.get("data", {}).get("shifts", [])
        print(f"✅ SUKCES! Wygenerowano {len(shifts)} zmian")
        
        # Sprawdź czy są zmiany w niedzielę
        sunday_shifts = [s for s in shifts if s.get("day_of_week") == "sunday"]
        print(f"   Zmian w niedzielę: {len(sunday_shifts)} (powinno być 0)")
        
        if sunday_shifts:
            print("   ❌ BŁĄD: Są zmiany w niedzielę mimo braku niedziel handlowych!")
        else:
            print("   ✅ Poprawnie - brak zmian w niedziele niehandlowe")
    else:
        print(f"❌ Błąd: {result.get('error')}")
        print(f"   Status: {result.get('status')}")
        if result.get('reasons'):
            print("   Przyczyny:")
            for r in result.get('reasons', []):
                print(f"     - {r}")
else:
    print(f"❌ HTTP Error {response.status_code}")
    print(f"   Response: {json.dumps(result, indent=2, ensure_ascii=False)}")
