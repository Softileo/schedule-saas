"""
Quick test: sprawdź połączenie Next.js -> Python Scheduler
"""
import requests
import json

BASE_URL = "http://localhost:8080"
API_KEY = "schedule-saas-local-dev-2026"

print("🔍 Testing Python Scheduler connectivity...")
print(f"URL: {BASE_URL}")
print()

# Test 1: Health
print("1️⃣  Health check...")
try:
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    print("   ✅ Health check OK\n")
except Exception as e:
    print(f"   ❌ Health check failed: {e}\n")
    exit(1)

# Test 2: Info
print("2️⃣  API Info...")
try:
    response = requests.get(f"{BASE_URL}/api/info", timeout=5)
    print(f"   Status: {response.status_code}")
    data = response.json()
    print(f"   Name: {data['name']}")
    print(f"   Version: {data['version']}")
    print(f"   Solver: {data['solver']}")
    print("   ✅ Info endpoint OK\n")
except Exception as e:
    print(f"   ❌ Info failed: {e}\n")
    exit(1)

# Test 3: Validate (bez auth - should fail)
print("3️⃣  Auth validation (should fail without key)...")
try:
    response = requests.post(
        f"{BASE_URL}/api/validate",
        json={"test": "data"},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 401:
        print("   ✅ Auth working - rejected without key\n")
    else:
        print(f"   ⚠️  Unexpected status: {response.status_code}\n")
except Exception as e:
    print(f"   ❌ Request failed: {e}\n")

# Test 4: Validate (with auth)
print("4️⃣  Auth validation (with key)...")
try:
    response = requests.post(
        f"{BASE_URL}/api/validate",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        },
        json={
            "year": 2026,
            "month": 2,
            "employees": [],
            "shift_templates": [],
            "organization_settings": {}
        },
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    data = response.json()
    print(f"   Result: {data}")
    print("   ✅ Auth working - accepted with key\n")
except Exception as e:
    print(f"   ❌ Request failed: {e}\n")

# Test 5: Mini generation
print("5️⃣  Mini generation test...")
mini_data = {
    "year": 2026,
    "month": 2,
    "organization_settings": {
        "store_open_time": "08:00:00",
        "store_close_time": "16:00:00",
        "min_employees_per_shift": 1,
        "enable_trading_sundays": False
    },
    "shift_templates": [
        {
            "id": "shift-1",
            "name": "Test Shift",
            "start_time": "08:00:00",
            "end_time": "16:00:00",
            "break_minutes": 30,
            "min_employees": 1,
            "max_employees": 2,
            "color": "#FF0000",
            "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
        }
    ],
    "employees": [
        {
            "id": "emp-1",
            "first_name": "Test",
            "last_name": "Employee",
            "position": "Worker",
            "employment_type": "full",
            "is_active": True,
            "color": "#00FF00"
        },
        {
            "id": "emp-2",
            "first_name": "Test",
            "last_name": "Manager",
            "position": "Manager",
            "employment_type": "full",
            "is_active": True,
            "color": "#0000FF"
        }
    ],
    "employee_preferences": [],
    "employee_absences": [],
    "scheduling_rules": {
        "max_consecutive_days": 6,
        "min_daily_rest_hours": 11,
        "max_weekly_work_hours": 48
    },
    "trading_sundays": [],
    "solver_time_limit": 30
}

try:
    print("   Sending request...")
    response = requests.post(
        f"{BASE_URL}/api/generate",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        },
        json=mini_data,
        timeout=60
    )
    
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Result Status: {data['status']}")
        
        if data['status'] == 'SUCCESS':
            shifts_count = len(data.get('shifts', []))
            solve_time = data.get('statistics', {}).get('solve_time_seconds', 0)
            print(f"   ✅ Generated {shifts_count} shifts in {solve_time:.2f}s")
            print(f"   Sample shift: {data['shifts'][0] if data['shifts'] else 'None'}")
        else:
            print(f"   Status: {data['status']}")
            print(f"   Details: {data.get('error', 'No error')}")
    else:
        print(f"   ❌ HTTP {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
except Exception as e:
    print(f"   ❌ Mini generation failed: {e}\n")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("✅ ALL CONNECTIVITY TESTS COMPLETED")
print("="*60)
print("\nNext.js can now use:")
print("  - Health check: GET /health")
print("  - Info: GET /api/info")
print("  - Generate: POST /api/generate (with X-API-Key header)")
print("  - Validate: POST /api/validate (with X-API-Key header)")
