import requests
import json

response = requests.post(
    'http://localhost:8080/api/generate',
    headers={'Content-Type': 'application/json', 'X-API-Key': 'schedule-saas-local-dev-2026'},
    json={
        'year': 2026,
        'month': 2,
        'monthly_hours_norm': 160,
        'organization_settings': {
            'store_open_time': '06:00:00',
            'store_close_time': '14:00:00',
            'min_employees_per_shift': 2,
            'enable_trading_sundays': False
        },
        'shift_templates': [{
            'id': 'test-1',
            'name': 'Test 8h',
            'start_time': '06:00:00',
            'end_time': '14:00:00',
            'break_minutes': 30,
            'min_employees': 2,
            'max_employees': 3,
            'applicable_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        }],
        'employees': [
            {'id': 'emp-1', 'first_name': 'Jan', 'last_name': 'Kowalski', 'employment_type': 'full', 'is_active': True},
            {'id': 'emp-2', 'first_name': 'Anna', 'last_name': 'Nowak', 'employment_type': 'full', 'is_active': True},
            {'id': 'emp-3', 'first_name': 'Piotr', 'last_name': 'Mazur', 'employment_type': 'full', 'is_active': True}
        ],
        'employee_preferences': [],
        'employee_absences': [],
        'scheduling_rules': {
            'max_consecutive_days': 6,
            'min_daily_rest_hours': 11,
            'max_weekly_work_hours': 48
        },
        'trading_sundays': [],
        'solver_time_limit': 60
    },
    timeout=60
)

print(f'Status: {response.status_code}')
if response.status_code == 200:
    result = response.json()
    print(f'\nSuccess: {result.get("success")}')
    print(f'Shifts count: {len(result.get("data", {}).get("shifts", []))}')
    
    stats = result.get('statistics', {})
    print(f'\nStatistics:')
    print(json.dumps(stats, indent=2))
    
    if result.get('success'):
        print(f'\n✅ TEST PASSED - Got {len(result.get("data", {}).get("shifts", []))} shifts')
    else:
        print(f'\n❌ TEST FAILED')
else:
    print(f'Error: {response.text}')
