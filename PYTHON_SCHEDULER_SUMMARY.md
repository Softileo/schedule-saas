# 🐍 Python Scheduler - Nowy Serwis Optymalizacji

## ✅ Co zostało stworzone?

Kompletny serwis Python do optymalizacji grafików pracy, gotowy do deploymentu na Google Cloud Run!

### Lokalizacja

```
python-scheduler/
├── main.py                    # Flask API server
├── Dockerfile                 # Docker dla Cloud Run
├── deploy.sh                  # Skrypt deploymentu ⚡
├── test_api.py               # Testy API
├── requirements.txt          # Zależności
├── QUICK_START.md           # Szybki start (5 minut!)
├── DEPLOYMENT.md            # Szczegółowa instrukcja
├── README.md                # Dokumentacja API
└── scheduler/               # Logika algorytmu
    ├── types.py            # Typy (kompatybilne z TS)
    ├── genetic_optimizer.py # Algorytm genetyczny
    ├── validator.py        # Kodeks Pracy
    ├── evaluator.py        # Metryki
    └── utils.py            # Narzędzia
```

## 🚀 Deploy w 3 krokach (5 minut!)

### 1. Test lokalny

```bash
cd python-scheduler
pip install -r requirements.txt
export API_KEY=dev-key
python main.py
# Test: curl http://localhost:8080/health
```

### 2. Deploy na Cloud Run

```bash
export API_KEY="your-secure-api-key"
./deploy.sh
# Otrzymasz URL: https://python-scheduler-xxx.europe-west1.run.app
```

### 3. Konfiguracja w Next.js

Dodaj do `.env.local`:

```bash
PYTHON_SCHEDULER_URL=https://python-scheduler-xxx.europe-west1.run.app
PYTHON_SCHEDULER_API_KEY=your-secure-api-key
```

I do Vercel (Settings → Environment Variables).

## 💻 Użycie w Aplikacji

### TypeScript Client (już gotowy!)

```typescript
// src/lib/api/python-scheduler.ts - już stworzony!

import {
    optimizeScheduleWithPython,
    checkPythonSchedulerHealth,
} from "@/lib/api/python-scheduler";

// Health check
const health = await checkPythonSchedulerHealth();

// Optymalizacja
const result = await optimizeScheduleWithPython(shifts, input, {
    populationSize: 30,
    generations: 100,
    timeoutMs: 5000,
});

console.log(`Improvement: ${result.improvement}%`);
```

### API Endpoint (już gotowy!)

```typescript
// src/app/api/schedule/optimize-python/route.ts - już stworzony!

POST /api/schedule/optimize-python
{
  "scheduleId": "uuid",
  "config": { ... }
}
```

## 🎯 Algorytm Genetyczny

### Cechy

- **Populacja**: 30 osobników (konfigurowane)
- **Generacje**: 100 iteracji (konfigurowane)
- **Selekcja**: Turniejowa
- **Krzyżowanie**: Jednopunktowe (70%)
- **Mutacje**: Swap, Move, Change Template (20%)
- **Elitaryzm**: Zachowanie 2 najlepszych

### Metryki Optymalizacji

- Wyrównanie godzin (waga: 30%)
- Wyrównanie zmian (waga: 20%)
- Wyrównanie weekendów (waga: 15%)
- Preferencje pracowników (waga: 20%)
- Typy zmian (waga: 10%)
- Kodeks Pracy (waga: 5%)

### Walidacja Kodeksu Pracy

- Art. 129: Max 8h/dzień, 40h/tydzień
- Art. 132: Min 11h odpoczynek dobowy
- Art. 133: Min 35h odpoczynek tygodniowy, max 6 dni pracy
- Art. 151: Max 2 niedziele/miesiąc

## 📡 API Endpoints

### 1. Health Check

```bash
GET /health
→ { "status": "healthy", "version": "1.0.0" }
```

### 2. Optimize Schedule

```bash
POST /api/optimize
Headers: X-API-Key: your-key
Body: { shifts, input, config }
→ { success: true, data: { shifts, metrics, improvement } }
```

### 3. Validate Schedule

```bash
POST /api/validate
Headers: X-API-Key: your-key
Body: { shifts, input }
→ { success: true, data: { violations, isValid, metrics } }
```

### 4. Evaluate Schedule

```bash
POST /api/evaluate
Headers: X-API-Key: your-key
Body: { shifts, input }
→ { success: true, data: { fitness, hours_balance, ... } }
```

## 🧪 Testowanie

```bash
cd python-scheduler

# Zainstaluj dependencies (jeśli jeszcze nie)
pip install -r requirements.txt

# Test lokalnie
python test_api.py

# Test na Cloud Run (edytuj BASE_URL w test_api.py)
python test_api.py
```

## 📊 Monitoring

### Logi

```bash
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=python-scheduler"
```

### Metryki w Console

https://console.cloud.google.com/run → python-scheduler → Metrics

## 💰 Koszty

Szacunkowo ~$5-10/miesiąc przy 1000 optymalizacji:

- Cloud Run free tier: 2M requests/miesiąc GRATIS
- Requests: $0.40
- CPU/Memory: $2-5

## 🔒 Bezpieczeństwo

✅ Zaimplementowane:

- API Key authentication (X-API-Key header)
- CORS configured
- Timeout limits (120s)
- Environment variables dla secrets

## 📚 Dokumentacja

- `QUICK_START.md` - Szybki start (5 minut)
- `DEPLOYMENT.md` - Szczegółowa instrukcja
- `README.md` - Dokumentacja API
- Kod Python z komentarzami

## 🎨 Integracja z UI

Przykład dodania przycisku w UI:

```typescript
// W komponencie grafiku
const handleOptimizeWithPython = async () => {
    setLoading(true);

    try {
        const response = await fetch("/api/schedule/optimize-python", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scheduleId: schedule.id,
                config: {
                    populationSize: 30,
                    generations: 100,
                    timeoutMs: 10000,
                },
            }),
        });

        const result = await response.json();

        toast.success(
            `Optymalizacja zakończona! Poprawa: ${result.improvement.toFixed(1)}%`,
        );

        // Odśwież grafik
        router.refresh();
    } catch (error) {
        toast.error("Błąd optymalizacji");
    } finally {
        setLoading(false);
    }
};
```

## 🎯 Następne Kroki

1. **Deploy serwisu** (2 minuty)

    ```bash
    cd python-scheduler
    export API_KEY="secure-key"
    ./deploy.sh
    ```

2. **Konfiguracja Vercel** (1 minuta)
    - Dodaj PYTHON_SCHEDULER_URL
    - Dodaj PYTHON_SCHEDULER_API_KEY

3. **Test w aplikacji** (1 minuta)

    ```typescript
    const health = await checkPythonSchedulerHealth();
    console.log(health); // { healthy: true }
    ```

4. **Dodaj do UI** (5 minut)
    - Przycisk "Optymalizuj z AI"
    - Wywołanie `/api/schedule/optimize-python`
    - Wyświetlenie metryk

## 🏗️ Architektura

```
┌────────────────┐
│   Next.js App  │  TypeScript
│   (Vercel)     │  • Generator (Greedy)
│                │  • ILP Optimizer
└───────┬────────┘  • Genetic Optimizer (TS)
        │
        │ HTTP/REST API
        │ X-API-Key
        ▼
┌────────────────┐
│ Python Service │  Python 3.11
│  (Cloud Run)   │  • Genetic Optimizer (Python)
│                │  • Validator (Kodeks Pracy)
│                │  • Evaluator (Metryki)
└────────────────┘  • Flask API
```

## ✨ Gotowe!

Wszystkie pliki zostały stworzone i są gotowe do użycia:

✅ Serwis Python z algorytmem genetycznym
✅ Dockerfile dla Cloud Run
✅ Skrypt deploymentu
✅ TypeScript client
✅ API endpoint w Next.js
✅ Testy
✅ Dokumentacja

**Start deploymentu**: `cd python-scheduler && ./deploy.sh`

---

💡 **Tip**: Przeczytaj `python-scheduler/QUICK_START.md` dla szybkiego wprowadzenia!

Pytania? Zobacz `python-scheduler/DEPLOYMENT.md` dla szczegółów.
