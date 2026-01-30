"""
=============================================================================
PYTHON SCHEDULER SERVICE - Google Cloud Run
=============================================================================

Serwis Python do optymalizacji grafików pracy.
Ekspozuje REST API i łączy się z aplikacją Next.js.

Algorytm:
1. Przyjmuje dane grafiku przez API
2. Optymalizuje za pomocą algorytmu genetycznego
3. Zwraca zoptymalizowany grafik

Zgodność z Kodeksem Pracy (Art. 129, 132, 133, 147)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime, timedelta
import logging

from scheduler.genetic_optimizer import GeneticOptimizer
from scheduler.greedy_scheduler import GreedyScheduler
from scheduler.ortools_optimizer import ORToolsScheduleOptimizer
from scheduler.validator import ScheduleValidator
from scheduler.types import SchedulerInput, GeneratedShift
from scheduler.evaluator import evaluate_schedule

# =============================================================================
# KONFIGURACJA
# =============================================================================

app = Flask(__name__)
CORS(app)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Key dla bezpieczeństwa
API_KEY = os.environ.get('API_KEY', 'dev-key-change-in-production')

# =============================================================================
# MIDDLEWARE
# =============================================================================

def verify_api_key():
    """Weryfikuje API key w nagłówku"""
    api_key = request.headers.get('X-API-Key')
    if api_key != API_KEY:
        return jsonify({
            'success': False,
            'error': 'Unauthorized - Invalid API Key'
        }), 401
    return None

# =============================================================================
# ENDPOINTS
# =============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check dla Cloud Run"""
    return jsonify({
        'status': 'healthy',
        'service': 'python-scheduler',
        'version': '3.0.0-ortools',
        'optimizer': 'Google OR-Tools CP-SAT',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/generate', methods=['POST'])
def generate_schedule():
    """
    Generuje IDEALNY grafik od zera używając Google OR-Tools CP-SAT Solver
    
    Body:
    {
        "input": {
            "year": 2026,
            "month": 1,
            "employees": [...],
            "templates": [...],
            "settings": {...},
            "holidays": [...],
            "workDays": [...],
            "saturdayDays": [...],
            "tradingSundays": [...]
        },
        "config": {
            "timeoutMs": 30000,  # Max czas optymalizacji
            "useORTools": true    # Użyj OR-Tools (domyślnie true)
        }
    }
    """
    # Weryfikacja API key
    auth_error = verify_api_key()
    if auth_error:
        return auth_error
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        input_data = data.get('input')
        config = data.get('config', {})
        
        if not input_data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: input'
            }), 400
        
        logger.info(f"📥 Generating IDEAL schedule for {input_data.get('year')}-{input_data.get('month'):02d}")
        logger.info(f"  Method: OR-Tools CP-SAT Solver")
        
        # Konwertuj dane wejściowe
        scheduler_input = SchedulerInput.from_dict(input_data)
        
        use_ortools = config.get('useORTools', True)
        
        if use_ortools:
            # METODA 1: OR-Tools CP-SAT (NAJLEPSZA - constraint programming)
            logger.info("🎯 Using OR-Tools CP-SAT Solver (OPTIMAL)")
            
            optimizer = ORToolsScheduleOptimizer(scheduler_input, config)
            result = optimizer.optimize()
            
            # Sprawdź czy zwrócono błąd (dict) czy listę zmian
            if isinstance(result, dict) and result.get('error'):
                # Nie można ułożyć grafiku - zwróć błąd z informacją
                logger.error(f"❌ Nie można ułożyć grafiku: {result['message']}")
                return jsonify({
                    'success': False,
                    'error': result['message'],
                    'code': result.get('code', 'SCHEDULE_ERROR'),
                    'details': result.get('details', {})
                }), 422  # Unprocessable Entity
            
            optimized_shifts = result
            
            if not optimized_shifts:
                # Fallback do Greedy + Genetic
                logger.warning("⚠️ OR-Tools nie znalazł rozwiązania, używam fallback (Greedy + Genetic)")
                greedy = GreedyScheduler(scheduler_input)
                initial_shifts = greedy.generate()
                
                genetic_optimizer = GeneticOptimizer(scheduler_input, config)
                optimized_shifts = genetic_optimizer.optimize(initial_shifts)
            
        else:
            # METODA 2: Greedy + Genetic (szybsza, ale mniej optymalna)
            logger.info("🚀 Using Greedy + Genetic Algorithm")
            
            greedy = GreedyScheduler(scheduler_input)
            initial_shifts = greedy.generate()
            
            initial_metrics = evaluate_schedule(initial_shifts, scheduler_input)
            logger.info(f"  Initial fitness: {initial_metrics['fitness']:.2f}")
            
            genetic_optimizer = GeneticOptimizer(scheduler_input, config)
            optimized_shifts = genetic_optimizer.optimize(initial_shifts)
        
        # WALIDACJA KOŃCOWA - sprawdź naruszenia Kodeksu Pracy
        validator = ScheduleValidator(scheduler_input)
        violations = validator.validate_all_shifts(optimized_shifts)
        
        # Filtruj tylko poważne błędy (errors, nie warnings)
        serious_violations = [v for v in violations if v.get('severity') == 'error']
        
        if serious_violations:
            logger.warning(f"⚠️ Wykryto {len(serious_violations)} naruszeń Kodeksu Pracy")
            for v in serious_violations[:5]:  # Log pierwsze 5
                logger.warning(f"  - {v['rule']}: {v['description']}")
        
        # Metryki końcowe
        final_metrics = evaluate_schedule(optimized_shifts, scheduler_input)
        final_metrics['violations'] = len(violations)
        final_metrics['serious_violations'] = len(serious_violations)
        
        logger.info(f"  Final fitness: {final_metrics['fitness']:.2f}")
        logger.info(f"  Generated shifts: {len(optimized_shifts)}")
        logger.info(f"  Violations: {len(violations)} (serious: {len(serious_violations)})")
        
        # Zwróć wynik z informacją o naruszeniach
        return jsonify({
            'success': True,
            'data': {
                'shifts': [s.to_dict() for s in optimized_shifts],
                'metrics': final_metrics,
                'violations': violations,
                'improvement': {
                    'initial': {},
                    'final': final_metrics,
                    'improvementPercent': final_metrics.get('fitness', 0)
                }
            },
            'warnings': [v['description'] for v in serious_violations] if serious_violations else []
        })
        
    except Exception as e:
        logger.error(f"❌ Error generating schedule: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/optimize', methods=['POST'])
def optimize_schedule():
    """
    Optymalizuje grafik algorytmem genetycznym
    
    Body:
    {
        "shifts": [...],
        "input": {
            "year": 2026,
            "month": 1,
            "employees": [...],
            "templates": [...],
            "settings": {...},
            "holidays": [...],
            "workDays": [...],
            "saturdayDays": [...],
            "tradingSundays": [...]
        },
        "config": {
            "populationSize": 30,
            "generations": 100,
            "mutationRate": 0.2,
            "crossoverRate": 0.7,
            "timeoutMs": 5000
        }
    }
    """
    # Weryfikacja API key
    auth_error = verify_api_key()
    if auth_error:
        return auth_error
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        # Parsowanie danych
        initial_shifts = data.get('shifts', [])
        input_data = data.get('input')
        config = data.get('config', {})
        
        if not input_data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: input'
            }), 400
        
        logger.info(f"Otrzymano żądanie optymalizacji: {len(initial_shifts)} zmian")
        
        # Konwertuj dane wejściowe
        scheduler_input = SchedulerInput.from_dict(input_data)
        shifts = [GeneratedShift.from_dict(s) for s in initial_shifts]
        
        # Walidacja początkowa
        validator = ScheduleValidator(scheduler_input)
        initial_metrics = evaluate_schedule(shifts, scheduler_input)
        
        logger.info(f"Fitness początkowy: {initial_metrics['fitness']}")
        
        # Optymalizacja genetyczna
        optimizer = GeneticOptimizer(scheduler_input, config)
        optimized_shifts = optimizer.optimize(shifts)
        
        # Metryki końcowe
        final_metrics = evaluate_schedule(optimized_shifts, scheduler_input)
        
        improvement = ((final_metrics['fitness'] - initial_metrics['fitness']) 
                      / initial_metrics['fitness'] * 100)
        
        logger.info(f"Fitness końcowy: {final_metrics['fitness']}")
        logger.info(f"Poprawa: {improvement:.2f}%")
        
        # Zwróć wynik
        return jsonify({
            'success': True,
            'data': {
                'shifts': [s.to_dict() for s in optimized_shifts],
                'metrics': final_metrics,
                'improvement': {
                    'initial': initial_metrics,
                    'final': final_metrics,
                    'improvementPercent': improvement
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd podczas optymalizacji: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/validate', methods=['POST'])
def validate_schedule():
    """
    Waliduje grafik pod kątem Kodeksu Pracy
    
    Body:
    {
        "shifts": [...],
        "input": {...}
    }
    """
    # Weryfikacja API key
    auth_error = verify_api_key()
    if auth_error:
        return auth_error
    
    try:
        data = request.get_json()
        
        shifts = data.get('shifts', [])
        input_data = data.get('input')
        
        if not input_data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: input'
            }), 400
        
        # Konwertuj dane
        scheduler_input = SchedulerInput.from_dict(input_data)
        shift_objs = [GeneratedShift.from_dict(s) for s in shifts]
        
        # Walidacja
        validator = ScheduleValidator(scheduler_input)
        violations = validator.validate_all_shifts(shift_objs)
        
        # Metryki
        metrics = evaluate_schedule(shift_objs, scheduler_input)
        
        return jsonify({
            'success': True,
            'data': {
                'violations': violations,
                'metrics': metrics,
                'isValid': len(violations) == 0
            }
        })
        
    except Exception as e:
        logger.error(f"Błąd podczas walidacji: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    """
    Ewaluuje jakość grafiku
    
    Body:
    {
        "shifts": [...],
        "input": {...}
    }
    """
    # Weryfikacja API key
    auth_error = verify_api_key()
    if auth_error:
        return auth_error
    
    try:
        data = request.get_json()
        
        shifts = data.get('shifts', [])
        input_data = data.get('input')
        
        if not input_data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: input'
            }), 400
        
        # Konwertuj dane
        scheduler_input = SchedulerInput.from_dict(input_data)
        shift_objs = [GeneratedShift.from_dict(s) for s in shifts]
        
        # Ewaluacja
        metrics = evaluate_schedule(shift_objs, scheduler_input)
        
        return jsonify({
            'success': True,
            'data': metrics
        })
        
    except Exception as e:
        logger.error(f"Błąd podczas ewaluacji: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
