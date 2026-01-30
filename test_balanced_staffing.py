#!/usr/bin/env python3
"""Test sprawdzający wyrównanie obsady między zmianami"""

import requests
import json
from collections import defaultdict

test_data = {
    "input": {
        "year": 2026,
        "month": 2,
        "employees": [
            {"id": "e1", "first_name": "Jan", "last_name": "K", "employment_type": "full", "absences": []},
            {"id": "e2", "first_name": "Anna", "last_name": "N", "employment_type": "full", "absences": []},
            {"id": "e3", "first_name": "Piotr", "last_name": "W", "employment_type": "full", "absences": []},
            {"id": "e4", "first_name": "Maria", "last_name": "Z", "employment_type": "full", "absences": []},
            {"id": "e5", "first_name": "Tomek", "last_name": "B", "employment_type": "full", "absences": []},
            {"id": "e6", "first_name": "Kasia", "last_name": "C", "employment_type": "full", "absences": []},
        ],
        "templates": [
            {"id": "t1", "name": "Rano", "start_time": "06:00", "end_time": "14:00", "min_employees": 2, "max_employees": 4},
            {"id": "t2", "name": "Wieczor", "start_time": "14:00", "end_time": "22:00", "min_employees": 2, "max_employees": 4},
        ],
        "settings": {},
        "holidays": [],
        "workDays": [],
        "saturdayDays": [],
        "tradingSundays": []
    },
    "config": {}
}

print("=" * 60)
print("TEST: Wyrównanie obsady między zmianami")
print("=" * 60)

response = requests.post(
    "http://localhost:8080/api/generate",
    json=test_data,
    headers={"X-API-Key": "schedule-saas-local-dev-2026"}
)

result = response.json()
print(f"\nStatus HTTP: {response.status_code}")
print(f"quality_percent: {result.get('data', {}).get('metrics', {}).get('quality_percent'):.1f}%")

shifts = result.get('data', {}).get('shifts', [])
print(f"Wygenerowano zmian: {len(shifts)}")

# Grupuj po dniu i zmianie
by_day_template = defaultdict(lambda: defaultdict(int))
for s in shifts:
    by_day_template[s['date']][s['template_name']] += 1

# Analiza rozkładu
print("\n📊 Rozkład obsady (pierwsze 10 dni):")
diffs = []
for day, templates in sorted(by_day_template.items())[:10]:
    rano = templates.get('Rano', 0)
    wieczor = templates.get('Wieczor', 0)
    diff = abs(rano - wieczor)
    diffs.append(diff)
    status = "✅" if diff <= 2 else "❌"
    print(f"  {day}: Rano={rano}, Wieczor={wieczor}, diff={diff} {status}")

avg_diff = sum(diffs) / len(diffs) if diffs else 0
print(f"\n📈 Średnia różnica obsady: {avg_diff:.2f}")
print(f"   Max różnica: {max(diffs) if diffs else 0}")

if max(diffs) <= 2:
    print("\n✅ Obsada jest wyrównana (max różnica ≤ 2)")
else:
    print("\n⚠️  Obsada nierównomierna!")
