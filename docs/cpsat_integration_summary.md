# 🎯 CP-SAT Optimizer - Integracja i Wyniki Testów

**Data:** 2026-01-30  
**Status:** ✅ Pełna Integracja i Walidacja

## 📋 Podsumowanie

Zaimplementowano i zintegrowano zaawansowany silnik optymalizacyjny Google OR-Tools CP-SAT do automatycznego generowania grafików pracy w aplikacji Calenda Schedule SaaS.

## 🏗️ Architektura

### Komponenty

1. **scheduler_optimizer.py** - Główny silnik CP-SAT
2. **app.py** - Flask API (REST endpoints)
3. **Docker** - Konteneryzacja serwisu Python
4. **Next.js** - Integracja przez HTTP API

### Endpoints API

```
GET  /health              - Health check
GET  /api/info           - Informacje o optimizer
POST /api/generate       - Generowanie grafiku
POST /api/validate       - Walidacja danych wejściowych
```

### Autentykacja

Wszystkie endpointy API wymagają headera:

```
X-API-Key: schedule-saas-local-dev-2026
```

## 🔒 Ograniczenia Twarde (Hard Constraints)

✅ **HC1: Brak nakładania zmian**

- Jeden pracownik może mieć maksymalnie 1 zmianę dziennie

✅ **HC2: Zgodność z urlopami**

- Automatyczne wykluczanie dni z `employee_absences`

✅ **HC3: Obsada zmian**

- Respektowanie `min_employees` i `max_employees` z `shift_templates`

✅ **HC4: Odpoczynek dobowy**

- Minimum 11h przerwy między zmianami

✅ **HC5: Niedziele handlowe**

- Respektowanie `trading_sundays` i `enable_trading_sundays`

✅ **HC6: Maksymalna ciągłość pracy**

- Limit dni pracy pod rząd (`max_consecutive_days`)

## 🎯 Cele Optymalizacyjne (Soft Constraints)

🎯 **SC1: Zgodność z etatem**

- Dążenie do 160h/miesiąc dla full-time, 80h dla part-time

🎯 **SC2: Preferencje godzinowe**

- Nagroda za zgodność z `preferred_start_time`

🎯 **SC3: Mix kompetencji**

- Premia za obecność managera na każdej zmianie

🎯 **SC4: Równomierne rozłożenie**

- Minimalizacja odchyleń w liczbie zmian między pracowników

## 📊 Wyniki Testów

### Test 1: Prosty Sklep Detaliczny

- **Pracownicy:** 5
- **Szablony zmian:** 2
- **Nieobecności:** 1
- **Status:** ✅ SUKCES
- **Wygenerowano:** 80 zmian
- **Czas:** 0.04s
- **Wartość funkcji celu:** 3800.0

### Test 2: Klinika Medyczna (24/5)

- **Pracownicy:** 8
- **Szablony zmian:** 3
- **Nieobecności:** 2
- **Status:** ✅ SUKCES
- **Wygenerowano:** 144 zmiany
- **Czas:** 0.14s
- **Wartość funkcji celu:** -5240.0

### Test 3: Restauracja (Zmiany przez północ)

- **Pracownicy:** 12
- **Szablony zmian:** 4 (w tym nocne przez północ)
- **Nieobecności:** 3
- **Status:** ✅ SUKCES
- **Wygenerowano:** 256 zmian
- **Czas:** 13.00s
- **Wartość funkcji celu:** 3400.0

## 🚀 Wydajność

| Scenariusz  | Zmienne | Ograniczenia | Czas   | Zmiany |
| ----------- | ------- | ------------ | ------ | ------ |
| Sklep       | 190     | 282          | 0.04s  | 80     |
| Klinika     | 546     | 808          | 0.14s  | 144    |
| Restauracja | 1021    | 1649         | 13.00s | 256    |

## 📦 Instalacja i Uruchomienie

### Docker (Lokalne)

```bash
# Build i start
docker compose up -d --build python-scheduler

# Health check
curl http://localhost:8080/health

# Info
curl http://localhost:8080/api/info
```

### Testy

```bash
# Uruchom kompleksowe testy
python3 test_cpsat_scenarios.py
```

## 🔧 Konfiguracja

### Environment Variables (.env)

```env
# DEVELOPMENT
PYTHON_SCHEDULER_URL_DEV=http://localhost:8080
PYTHON_SCHEDULER_API_KEY_DEV=schedule-saas-local-dev-2026

# PRODUCTION (Cloud Run)
PYTHON_SCHEDULER_URL=https://python-scheduler-155306113106.europe-west1.run.app
PYTHON_SCHEDULER_API_KEY=schedule-saas-production-2026
```

### Docker Compose

```yaml
python-scheduler:
    build: ./python-scheduler
    ports:
        - "8080:8080"
    environment:
        - API_KEY=schedule-saas-local-dev-2026
    command: gunicorn --bind :8080 --workers 2 --threads 4 --timeout 300 --reload app:app
```

## 📝 Przykład Użycia API

### Request

```bash
curl -X POST http://localhost:8080/api/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: schedule-saas-local-dev-2026" \
  -d @input_data.json
```

### Input JSON

```json
{
  "year": 2026,
  "month": 2,
  "organization_settings": {
    "store_open_time": "08:00:00",
    "store_close_time": "20:00:00",
    "min_employees_per_shift": 2,
    "enable_trading_sundays": false
  },
  "shift_templates": [
    {
      "id": "morning",
      "name": "Poranna",
      "start_time": "08:00:00",
      "end_time": "16:00:00",
      "break_minutes": 30,
      "min_employees": 2,
      "max_employees": 3,
      "applicable_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }
  ],
  "employees": [...],
  "employee_preferences": [...],
  "employee_absences": [...],
  "scheduling_rules": {
    "max_consecutive_days": 6,
    "min_daily_rest_hours": 11,
    "max_weekly_work_hours": 48
  },
  "trading_sundays": [],
  "solver_time_limit": 300
}
```

### Response (SUCCESS)

```json
{
    "status": "SUCCESS",
    "shifts": [
        {
            "employee_id": "emp-1",
            "employee_name": "Jan Kowalski",
            "date": "2026-02-01",
            "start_time": "08:00:00",
            "end_time": "16:00:00",
            "break_minutes": 30,
            "template_id": "morning",
            "template_name": "Poranna",
            "color": "#FF6B6B",
            "notes": null
        }
    ],
    "statistics": {
        "status": "OPTIMAL",
        "objective_value": 3800.0,
        "solve_time_seconds": 0.08,
        "total_shifts_assigned": 80,
        "total_variables": 190,
        "hard_constraints": 282,
        "soft_constraints": 5,
        "conflicts": 0,
        "branches": 154
    },
    "year": 2026,
    "month": 2
}
```

### Response (INFEASIBLE)

```json
{
    "status": "INFEASIBLE",
    "error": "Problem niemożliwy do rozwiązania",
    "reasons": [
        "Za mało dostępnych pracowników/zmiennych (150) względem wymagań (240)",
        "Ponad 50% dni ma nieobecności - zbyt duże obciążenie urlopowe"
    ],
    "suggestions": [
        "Zwiększ liczbę pracowników",
        "Zmniejsz min_employees w shift_templates",
        "Zwiększ max_consecutive_days w scheduling_rules",
        "Sprawdź konflikty w employee_absences",
        "Rozważ złagodzenie wymagań obsady"
    ]
}
```

## 🔍 Diagnostyka INFEASIBLE

Optimizer automatycznie analizuje przyczyny niemożliwości rozwiązania:

1. **Pokrycie obsady** - Czy jest wystarczająco dużo zmiennych decyzyjnych?
2. **Nieobecności** - Czy urlopy nie blokują zbyt wielu dni?
3. **Niedziele handlowe** - Czy nie ma konfliktów z wymaganiami?
4. **Ograniczenia czasowe** - Czy limity nie są zbyt restrykcyjne?
5. **Odpoczynek dobowy** - Czy możliwe jest zachowanie 11h przerwy?

## 🎓 Teoria CP-SAT

### Czym jest CP-SAT?

**Constraint Programming with SAT** - solver łączący:

- **Programowanie z ograniczeniami** (Constraint Programming)
- **Boolean Satisfiability** (SAT solving)

### Dlaczego CP-SAT?

✅ **Globalnie optymalne rozwiązania** (w rozsądnym czasie)  
✅ **Elastyczne modelowanie** ograniczeń  
✅ **Efektywność** dla problemów kombinatorycznych  
✅ **Diagnostyka** niemożliwości rozwiązania  
✅ **Skalowość** (do tysięcy zmiennych)

### Alternatywy

- **Integer Linear Programming (ILP)** - wymaga linearyzacji
- **Genetic Algorithms** - heurystyczne, brak gwarancji optymalności
- **Greedy/Heurystyka** - szybkie ale nieoptymalne

## 📈 Metryki Jakości

### Wartość funkcji celu

Im wyższa wartość, tym lepsze rozwiązanie:

- **Dodatnia**: Dobra zgodność z preferencjami i etatem
- **Ujemna**: Kompromisy były konieczne
- **0**: Brak optymalizacji miękkich, tylko twarde ograniczenia

###Czas rozwiązywania

- **< 1s**: Prosty problem, małe dane
- **1-30s**: Średni problem, typowe użycie
- **30-300s**: Złożony problem, duże dane lub restrykcyjne ograniczenia

## 🚧 Ograniczenia i Rozszerzenia

### Obecne ograniczenia

- Brak obsługi rotacji zmian
- Brak preferencji "nie pracuj razem z X"
- Brak priorytetów pracowników
- Brak automatycznego wyboru długości zmiany

### Planowane rozszerzenia

1. **Fairness scoring** - sprawiedliwe rozłożenie weekendów
2. **Skill matching** - przypisywanie według kompetencji
3. **Multi-location** - obsługa wielu lokalizacji
4. **What-if analysis** - symulacje scenariuszy

## 🏆 Podsumowanie

✅ **3/3 testy przeszły pomyślnie**  
✅ **Zintegrowano z aplikacją Next.js**  
✅ **Gotowe do deploymentu na Cloud Run**  
✅ **Dokumentacja kompletna**  
✅ **Diagnostyka INFEASIBLE działa**

---

**Następne kroki:**

1. Integracja z frontendem Next.js
2. Deploy na Google Cloud Run
3. Monitoring i logi produkcyjne
4. Testy A/B z użytkownikami
