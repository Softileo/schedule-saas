"""
Calenda Schedule - Python Scheduler API
Flask API dla generowania grafików z użyciem CP-SAT Optimizer
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
import traceback
from scheduler_optimizer import generate_schedule_optimized

app = Flask(__name__)

# CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "https://calenda.pl",
            "https://*.calenda.pl"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-API-Key"]
    }
})

# API Key validation
API_KEY = os.getenv('API_KEY', 'schedule-saas-local-dev-2026')

def validate_api_key():
    """Walidacja klucza API z headera."""
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        return False, "Missing X-API-Key header"
    if api_key != API_KEY:
        return False, "Invalid API key"
    return True, None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'calenda-schedule-python-scheduler',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0-cpsat'
    })


def transform_nextjs_input(data: dict) -> dict:
    """
    Transformuje dane z formatu Next.js do formatu CP-SAT.
    
    Next.js format:
    {
        "input": {
            "year": 2026,
            "month": 1,
            "employees": [{id, name, contract_type, weekly_hours, preferences, absences, template_assignments}],
            "templates": [{id, name, start_time, end_time, break_minutes, days_of_week, min_employees, max_employees}],
            "settings": {...},
            "holidays": [...],
            "trading_sundays": [...],
            "template_assignments_map": {...}
        },
        "config": {...}
    }
    
    CP-SAT format:
    {
        "year": 2026,
        "month": 1,
        "organization_settings": {...},
        "shift_templates": [...],
        "employees": [...],
        "employee_preferences": [...],
        "employee_absences": [...],
        "scheduling_rules": {...},
        "trading_sundays": [...]
    }
    """
    input_data = data.get('input', data)
    config = data.get('config', {})
    
    year = input_data.get('year')
    month = input_data.get('month')
    
    # Transform employees
    employees = []
    employee_preferences = []
    employee_absences = []
    
    for emp in input_data.get('employees', []):
        # Parsuj imię i nazwisko z pola 'name'
        name_parts = emp.get('name', '').split(' ', 1)
        first_name = name_parts[0] if name_parts else 'Unknown'
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Mapuj contract_type na employment_type
        contract_type = emp.get('contract_type', 'full')
        employment_type_map = {
            'full_time': 'full',
            'part_time': 'half',
            'full': 'full',
            'half': 'half',
            'three_quarter': 'three_quarter',
            'one_third': 'one_third',
            'custom': 'custom'
        }
        employment_type = employment_type_map.get(contract_type, 'full')
        
        employees.append({
            'id': emp.get('id'),
            'first_name': first_name,
            'last_name': last_name,
            'position': emp.get('position', 'Pracownik'),
            'employment_type': employment_type,
            'custom_hours': emp.get('custom_monthly_hours'),  # Godziny miesięczne dla custom etatu
            'is_active': True,
            'color': emp.get('color')
        })
        
        # Preferences
        prefs = emp.get('preferences')
        if prefs:
            employee_preferences.append({
                'employee_id': emp.get('id'),
                'preferred_start_time': None,
                'max_hours_per_week': prefs.get('max_hours_per_week'),
                'can_work_weekends': True,
                'preferred_days': prefs.get('preferred_days', []),
                'unavailable_days': prefs.get('avoided_days', [])
            })
        
        # Absences
        for absence in emp.get('absences', []):
            employee_absences.append({
                'employee_id': emp.get('id'),
                'start_date': absence.get('start_date'),
                'end_date': absence.get('end_date'),
                'absence_type': absence.get('type', 'other')
            })
    
    # Transform templates
    shift_templates = []
    for tmpl in input_data.get('templates', []):
        # Konwertuj days_of_week na applicable_days
        days_of_week = tmpl.get('days_of_week', [])
        
        shift_templates.append({
            'id': tmpl.get('id'),
            'name': tmpl.get('name'),
            'start_time': tmpl.get('start_time', '08:00') + ':00' if len(tmpl.get('start_time', '')) == 5 else tmpl.get('start_time', '08:00:00'),
            'end_time': tmpl.get('end_time', '16:00') + ':00' if len(tmpl.get('end_time', '')) == 5 else tmpl.get('end_time', '16:00:00'),
            'break_minutes': tmpl.get('break_minutes', 0),
            'min_employees': tmpl.get('min_employees', 1),
            'max_employees': tmpl.get('max_employees'),
            'color': tmpl.get('color'),
            'applicable_days': days_of_week
        })
    
    # Settings
    settings = input_data.get('settings', {})
    organization_settings = {
        'store_open_time': '08:00:00',
        'store_close_time': '20:00:00',
        'min_employees_per_shift': settings.get('min_staff_per_shift', 1),
        'enable_trading_sundays': len(input_data.get('trading_sundays', [])) > 0
    }
    
    # Trading sundays
    trading_sundays = []
    for ts in input_data.get('trading_sundays', []):
        if isinstance(ts, str):
            trading_sundays.append({'date': ts, 'is_active': True})
        else:
            trading_sundays.append(ts)
    
    # Scheduling rules
    scheduling_rules = {
        'max_consecutive_days': settings.get('max_consecutive_work_days', 6),
        'min_daily_rest_hours': 11,
        'max_weekly_work_hours': 48
    }
    
    # Solver time limit from config
    solver_time_limit = config.get('timeout_ms', 300000) // 1000  # Convert ms to seconds
    
    return {
        'year': year,
        'month': month,
        'organization_settings': organization_settings,
        'shift_templates': shift_templates,
        'employees': employees,
        'employee_preferences': employee_preferences,
        'employee_absences': employee_absences,
        'scheduling_rules': scheduling_rules,
        'trading_sundays': trading_sundays,
        'solver_time_limit': solver_time_limit
    }


@app.route('/api/generate', methods=['POST', 'OPTIONS'])
def generate_schedule():
    """
    Główny endpoint do generowania grafiku.
    Obsługuje DWA formaty danych:
    
    1. Format CP-SAT (bezpośredni):
    {
        "year": 2026,
        "month": 2,
        "organization_settings": {...},
        "shift_templates": [...],
        "employees": [...],
        ...
    }
    
    2. Format Next.js (opakowany):
    {
        "input": {
            "year": 2026,
            "month": 2,
            "employees": [...],
            "templates": [...],
            ...
        },
        "config": {...}
    }
    """
    
    # Handle OPTIONS for CORS
    if request.method == 'OPTIONS':
        return '', 204
    
    # Validate API key
    is_valid, error_message = validate_api_key()
    if not is_valid:
        return jsonify({
            'status': 'ERROR',
            'error': error_message
        }), 401
    
    try:
        # Parse request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'ERROR',
                'error': 'No JSON data provided'
            }), 400
        
        # Detect format: Next.js wrapper or direct CP-SAT
        if 'input' in data:
            # Next.js format - needs transformation
            print("📦 Detected Next.js format - transforming...")
            data = transform_nextjs_input(data)
        
        # Validate required fields
        required_fields = ['year', 'month', 'employees', 'shift_templates', 'organization_settings']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'status': 'ERROR',
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        print(f"\n{'='*80}")
        print(f"📅 Generating schedule for: {data['year']}-{data['month']:02d}")
        print(f"👥 Employees: {len(data.get('employees', []))}")
        print(f"📋 Shift templates: {len(data.get('shift_templates', []))}")
        
        # SZCZEGÓŁOWE LOGOWANIE DANYCH
        print(f"\n{'='*60}")
        print("📊 SZCZEGÓŁOWE DANE WEJŚCIOWE:")
        print(f"{'='*60}")
        
        # 1. Pracownicy
        print(f"\n👥 PRACOWNICY ({len(data.get('employees', []))}):")
        for i, emp in enumerate(data.get('employees', []), 1):
            name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
            emp_type = emp.get('employment_type', 'full')
            custom_h = emp.get('custom_hours')
            print(f"  {i}. {name[:30]:30s} | Typ: {emp_type:12s} | Custom: {custom_h}")
        
        # 2. Szablony zmian
        print(f"\n📋 SZABLONY ZMIAN ({len(data.get('shift_templates', []))}):")
        for i, tmpl in enumerate(data.get('shift_templates', []), 1):
            name = tmpl.get('name', 'Unknown')
            start = tmpl.get('start_time', '??:??')
            end = tmpl.get('end_time', '??:??')
            min_emp = tmpl.get('min_employees', 1)
            max_emp = tmpl.get('max_employees', 'NULL')
            print(f"  {i}. {name[:20]:20s} | {start}-{end} | Min: {min_emp} | Max: {max_emp}")
        
        # 3. Ustawienia organizacji
        org_set = data.get('organization_settings', {})
        print(f"\n⚙️  USTAWIENIA ORGANIZACJI:")
        print(f"  • Niedziele handlowe: {org_set.get('enable_trading_sundays', False)}")
        print(f"  • Min pracowników/zmianę: {org_set.get('min_employees_per_shift', 'N/A')}")
        
        # 4. Reguły planowania
        rules = data.get('scheduling_rules', {})
        print(f"\n📏 REGUŁY PLANOWANIA:")
        print(f"  • Max godzin/tydzień: {rules.get('max_weekly_work_hours', 48)}h")
        print(f"  • Min odpoczynek: {rules.get('min_daily_rest_hours', 11)}h")
        print(f"  • Max dni z rzędu: {rules.get('max_consecutive_days', 6)}")
        
        # 5. Norma miesięczna
        monthly_norm = data.get('monthly_hours_norm')
        print(f"\n⏰ NORMA MIESIĘCZNA: {monthly_norm}h")
        
        # 6. Nieobecności
        absences = data.get('employee_absences', [])
        print(f"\n🚫 NIEOBECNOŚCI: {len(absences)}")
        for i, abs in enumerate(absences[:5], 1):  # Pokaż max 5
            print(f"  {i}. Employee: {abs.get('employee_id', 'N/A')[:12]} | {abs.get('start_date')} → {abs.get('end_date')}")
        if len(absences) > 5:
            print(f"  ... i {len(absences) - 5} więcej")
        
        # 7. Niedziele handlowe
        trading_sun = data.get('trading_sundays', [])
        print(f"\n📅 NIEDZIELE HANDLOWE: {len(trading_sun)}")
        for ts in trading_sun:
            print(f"  • {ts.get('date')} - aktywna: {ts.get('is_active', True)}")
        
        print(f"\n{'='*60}\n")
        print(f"{'='*80}\n")
        
        # Call optimizer
        result = generate_schedule_optimized(data)
        
        # Log result
        print(f"\n{'='*80}")
        print(f"✅ Generation completed: {result['status']}")
        if result['status'] == 'SUCCESS':
            print(f"📊 Shifts generated: {len(result.get('shifts', []))}")
            print(f"⏱️  Solve time: {result.get('statistics', {}).get('solve_time_seconds', 0):.2f}s")
        print(f"{'='*80}\n")
        
        # Transform response for Next.js compatibility
        if result['status'] == 'SUCCESS':
            # Pobierz quality_percent z CP-SAT lub oblicz fallback
            stats = result.get('statistics', {})
            quality_percent = stats.get('quality_percent', 75.0)
            
            return jsonify({
                'success': True,
                'data': {
                    'shifts': result.get('shifts', []),
                    'metrics': {
                        'fitness': quality_percent,  # Teraz to procent 0-100%, nie raw objective
                        'quality_percent': quality_percent,
                        'total_shifts': len(result.get('shifts', [])),
                        'employees_count': len(data.get('employees', [])),
                        'hours_balance': 0.8,
                        'shift_balance': 0.9,
                        'weekend_balance': 0.8,
                        'preferences_score': 0.7,
                        'shift_type_balance': 0.9,
                        'labor_code_score': 1.0,
                        'objective_value': stats.get('objective_value', 0)
                    },
                    'improvement': {
                        'initial': {'fitness': 0},
                        'final': {'fitness': quality_percent},
                        'improvementPercent': quality_percent
                    }
                },
                'status': 'SUCCESS',
                'statistics': stats
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Generation failed'),
                'reasons': result.get('reasons', []),
                'suggestions': result.get('suggestions', []),
                'status': result['status']
            }), 400
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"\n❌ ERROR in /api/generate:")
        print(error_trace)
        
        return jsonify({
            'success': False,
            'status': 'ERROR',
            'error': str(e),
            'traceback': error_trace
        }), 500


@app.route('/api/validate', methods=['POST', 'OPTIONS'])
def validate_constraints():
    """
    Endpoint do walidacji danych wejściowych bez generowania grafiku.
    Sprawdza czy dane są poprawne i czy istnieje szansa na rozwiązanie.
    """
    
    if request.method == 'OPTIONS':
        return '', 204
    
    # Validate API key
    is_valid, error_message = validate_api_key()
    if not is_valid:
        return jsonify({
            'status': 'ERROR',
            'error': error_message
        }), 401
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'ERROR',
                'error': 'No JSON data provided'
            }), 400
        
        # Basic validation
        errors = []
        warnings = []
        
        # Check required fields
        required_fields = ['year', 'month', 'employees', 'shift_templates', 'organization_settings']
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")
        
        if errors:
            return jsonify({
                'status': 'INVALID',
                'errors': errors,
                'warnings': warnings
            }), 400
        
        # Check data quality
        employees = data.get('employees', [])
        shift_templates = data.get('shift_templates', [])
        
        if len(employees) == 0:
            errors.append("No employees provided")
        
        if len(shift_templates) == 0:
            errors.append("No shift templates provided")
        
        # Calculate rough feasibility
        if len(employees) > 0 and len(shift_templates) > 0:
            total_required = sum(t.get('min_employees', 1) * 28 for t in shift_templates)
            max_possible = len(employees) * 28
            
            if total_required > max_possible:
                warnings.append(f"Required shifts ({total_required}) may exceed capacity ({max_possible})")
        
        # Check for absences
        absences = data.get('employee_absences', [])
        if len(absences) > len(employees) * 5:
            warnings.append(f"High number of absences ({len(absences)}) may cause scheduling issues")
        
        return jsonify({
            'status': 'VALID' if len(errors) == 0 else 'INVALID',
            'errors': errors,
            'warnings': warnings,
            'summary': {
                'employees': len(employees),
                'shift_templates': len(shift_templates),
                'absences': len(absences)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'ERROR',
            'error': str(e)
        }), 500


@app.route('/api/info', methods=['GET'])
def get_info():
    """Informacje o optimizer i jego możliwościach."""
    return jsonify({
        'name': 'Calenda Schedule CP-SAT Optimizer',
        'version': '2.0.0',
        'solver': 'Google OR-Tools CP-SAT',
        'capabilities': {
            'hard_constraints': [
                'No overlapping shifts',
                'Employee absences compliance',
                'Shift staffing requirements',
                'Daily rest (11h minimum)',
                'Trading sundays compliance',
                'Maximum consecutive work days'
            ],
            'soft_constraints': [
                'Employment type hours optimization',
                'Time preferences matching',
                'Manager presence on shifts',
                'Balanced shift distribution'
            ]
        },
        'limits': {
            'max_employees': 1000,
            'max_shift_templates': 50,
            'max_days': 31,
            'default_solve_time_seconds': 300
        }
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    print(f"\n{'='*80}")
    print(f"🚀 Starting Calenda Schedule Python Scheduler")
    print(f"{'='*80}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"API Key: {API_KEY[:10]}...")
    print(f"{'='*80}\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
