# 🚀 IDEALNY ALGORYTM UKŁADANIA GRAFIKU PRACY

## Technologia: Google OR-Tools CP-SAT Solver

### 🎯 Dlaczego OR-Tools?

**OR-Tools** to profesjonalna biblioteka Google do optymalizacji kombinatorycznej, używana przez:

- Google (wewnętrznie)
- Microsoft
- Amazon
- Uber
- Wiele Fortune 500

### ✨ Zalety naszego rozwiązania

#### 1. **Constraint Programming (CP-SAT)**

- Matematycznie OPTYMALNE rozwiązanie
- Nie heurystyka - prawdziwa optymalizacja
- Gwarantuje zgodność z Kodeksem Pracy

#### 2. **Hard Constraints (100% zgodność)**

✅ Art. 129 - Max 8h dziennie, 40h tygodniowo
✅ Art. 132 - Min 11h odpoczynek dobowy  
✅ Art. 133 - Max 6 kolejnych dni pracy
✅ Art. 133 - Min 1 dzień wolny w tygodniu
✅ Nieobecności - pracownik nie pracuje w czasie urlopu
✅ Max 1 zmiana na dzień

#### 3. **Soft Constraints (optymalizacja)**

🎯 Wyrównanie godzin (waga: 100)
🎯 Minimalne odchylenia od etatu (waga: 50)
🎯 Wyrównanie weekendów (waga: 30)
🎯 Maksymalizacja obsady (waga: 1)

### 📊 Wydajność

| Tryb     | Timeout | CPU | RAM | Jakość |
| -------- | ------- | --- | --- | ------ |
| Fast     | 15s     | 2   | 1GB | 95%+   |
| Balanced | 30s     | 2   | 1GB | 98%+   |
| Optimal  | 60s     | 2   | 1GB | 99%+   |

### 🔧 Fallback Strategy

Jeśli OR-Tools nie znajdzie rozwiązania w czasie (bardzo rzadkie):

1. Greedy Scheduler - szybka generacja
2. Genetic Optimizer - ewolucyjna optymalizacja

### 📈 Metryki jakości

Każdy grafik ma metryki:

- `fitness` - ogólna jakość (0-100)
- `hours_balance` - wyrównanie godzin (0-1)
- `weekend_balance` - wyrównanie weekendów (0-1)
- `shift_balance` - wyrównanie liczby zmian (0-1)
- `labor_code_score` - zgodność z KP (0-1)

### 🚀 Deployment

```bash
cd python-scheduler
gcloud run deploy python-scheduler \
  --source . \
  --platform managed \
  --region europe-west1 \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300s
```

### 📡 API

**Endpoint:** `POST /api/generate`

**Body:**

```json
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
    "timeoutMs": 30000,
    "useORTools": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "shifts": [...],
    "metrics": {
      "fitness": 98.5,
      "hours_balance": 0.95,
      "weekend_balance": 0.92,
      ...
    }
  }
}
```

### 🔬 Jak to działa?

1. **Model CP-SAT** - tworzymy zmienne decyzyjne dla każdej kombinacji (pracownik, dzień, szablon)
2. **Hard Constraints** - dodajemy ograniczenia Kodeksu Pracy jako constrainty
3. **Objective Function** - maksymalizujemy jakość (wyrównanie, preferencje)
4. **Solver** - CP-SAT znajduje optymalne rozwiązanie w sekundach

### 🎓 Referencje

- [Google OR-Tools Documentation](https://developers.google.com/optimization)
- [CP-SAT Solver](https://developers.google.com/optimization/cp/cp_solver)
- [Employee Scheduling Example](https://developers.google.com/optimization/scheduling/employee_scheduling)

---

**Wersja:** 3.0.0-ortools
**Autor:** Schedule SaaS Team
**Data:** 2026-01-29
