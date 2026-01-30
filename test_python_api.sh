#!/bin/bash

curl -X POST http://localhost:8080/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {"id": "emp-1", "name": "Jan Kowalski", "weekly_hours": 40, "preferences": {}},
      {"id": "emp-2", "name": "Anna Nowak", "weekly_hours": 40, "preferences": {}},
      {"id": "emp-3", "name": "Piotr W", "weekly_hours": 32, "preferences": {}}
    ],
    "shift_templates": [
      {"id": "shift-1", "name": "Poranna", "start_time": "06:00", "end_time": "18:00", "min_employees": 1, "max_employees": 2, "color": "#FF5733"},
      {"id": "shift-2", "name": "Nocna", "start_time": "18:00", "end_time": "06:00", "min_employees": 1, "max_employees": 2, "color": "#3366FF"}
    ],
    "work_days": ["2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05", "2026-02-06", "2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-13", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-23", "2026-02-24", "2026-02-25", "2026-02-26", "2026-02-27"],
    "saturday_days": ["2026-02-07", "2026-02-14", "2026-02-21", "2026-02-28"],
    "sunday_days": ["2026-02-01", "2026-02-08", "2026-02-15", "2026-02-22"],
    "year": 2026,
    "month": 2
  }' 2>&1 | tee /tmp/api_result.json

echo ""
echo "=== PODSUMOWANIE ==="
cat /tmp/api_result.json | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f\"Quality Score: {data.get('quality_score', 'N/A')}%\")
    
    shifts = data.get('shifts', [])
    hours = {}
    for s in shifts:
        emp = s.get('employee_id', s.get('employee_name', 'unknown'))
        duration = 12  # default
        hours[emp] = hours.get(emp, 0) + duration
    
    print(f\"Liczba zmian: {len(shifts)}\")
    for emp, h in hours.items():
        print(f\"  {emp}: {h}h\")
except Exception as e:
    print(f'Error parsing: {e}')
"
