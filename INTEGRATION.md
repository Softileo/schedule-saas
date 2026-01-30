# 🚀 Schedule SaaS - Full Stack Development

## 🏗️ Architektura

```
┌─────────────────────────────────┐
│   Next.js (calenda.pl)          │
│   - Frontend                    │
│   - API Routes                  │
│   - Supabase Client             │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   Python Scheduler API          │
│                                 │
│   DEVELOPMENT (localhost:8080)  │
│   └─ Docker Container           │
│                                 │
│   PRODUCTION (Cloud Run)        │
│   └─ europe-west1               │
└─────────────────────────────────┘
```

## 🔧 Setup Lokalny (Development)

### 1. Wymagania

- Docker Desktop
- Node.js 18+
- Python 3.11+ (opcjonalnie, dla developmentu bez Dockera)

### 2. Szybki start

```bash
# Uruchom Python Scheduler w Dockerze
./start-dev.sh

# W osobnym terminalu - uruchom Next.js
npm run dev
```

### 3. Ręczny start

```bash
# Python Scheduler (Docker)
docker-compose up -d python-scheduler

# Next.js
npm run dev
```

### 4. VS Code Debug

W VS Code:

1. Naciśnij `F5`
2. Wybierz "Full Stack: Next.js + Python"
3. Automatycznie uruchomi Docker + Next.js

## 🌍 Konfiguracja Środowisk

### Development (.env.local lub .env)

```env
PYTHON_SCHEDULER_URL_DEV=http://localhost:8080
PYTHON_SCHEDULER_API_KEY_DEV=schedule-saas-local-dev-2026
```

### Production (Vercel/Cloud)

```env
PYTHON_SCHEDULER_URL=https://python-scheduler-155306113106.europe-west1.run.app
PYTHON_SCHEDULER_API_KEY=schedule-saas-production-2026
```

## 🐳 Docker Commands

```bash
# Uruchom wszystko
docker-compose up -d

# Tylko Python Scheduler
docker-compose up -d python-scheduler

# Logi live
docker-compose logs -f python-scheduler

# Restart
docker-compose restart python-scheduler

# Zatrzymaj wszystko
docker-compose down

# Rebuild obrazu
docker-compose build python-scheduler
docker-compose up -d python-scheduler
```

## 📡 API Endpoints

### Local (Development)

- **Base URL**: `http://localhost:8080`
- **Health**: `GET http://localhost:8080/health`
- **Generate**: `POST http://localhost:8080/api/generate`
- **Optimize**: `POST http://localhost:8080/api/optimize`
- **Validate**: `POST http://localhost:8080/api/validate`

### Production (Cloud Run)

- **Base URL**: `https://python-scheduler-155306113106.europe-west1.run.app`
- Same endpoints as above

## 🧪 Testowanie

### Test Health Check (Local)

```bash
curl http://localhost:8080/health
```

### Test Generation (Local)

```bash
curl -X POST http://localhost:8080/api/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: schedule-saas-local-dev-2026" \
  -d @test-data.json
```

### Test z Next.js

```bash
# Next.js automatycznie użyje localhost:8080 w development
npm run dev
# Przejdź do http://localhost:3000 i wygeneruj grafik
```

## 🚀 Deployment

### Deploy Python na Cloud Run

```bash
cd python-scheduler
gcloud run deploy python-scheduler \
  --source . \
  --region europe-west1 \
  --memory 1Gi \
  --cpu 2 \
  --set-env-vars="API_KEY=schedule-saas-production-2026"
```

### Deploy Next.js

```bash
# Vercel
vercel deploy --prod

# Lub inna platforma
npm run build
npm run start
```

## 🐛 Troubleshooting

### Python Scheduler nie odpowiada

```bash
# Sprawdź czy Docker działa
docker ps

# Sprawdź logi
docker-compose logs python-scheduler

# Restart
docker-compose restart python-scheduler
```

### Next.js nie łączy się z Python

```bash
# Sprawdź zmienne środowiskowe
echo $PYTHON_SCHEDULER_URL_DEV

# Sprawdź czy port 8080 jest wolny
lsof -i :8080

# Sprawdź health check
curl http://localhost:8080/health
```

### Build Error w Dockerze

```bash
# Rebuild obrazu
docker-compose build --no-cache python-scheduler
docker-compose up -d python-scheduler
```

## 📊 Monitoring

### Logs - Local

```bash
docker-compose logs -f python-scheduler
```

### Logs - Production (Cloud Run)

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=python-scheduler" \
  --limit 50 \
  --format json
```

## 🔐 Security

### API Keys

- **Development**: `schedule-saas-local-dev-2026` (tylko localhost)
- **Production**: `schedule-saas-production-2026` (Cloud Run)

### CORS

- Development: `http://localhost:3000`
- Production: `https://calenda.pl`, `https://*.calenda.pl`

## 📁 Struktura Plików

```
schedule-saas/
├── docker-compose.yml          # Docker config
├── start-dev.sh               # Quick start script
├── .vscode/
│   ├── launch.json            # VS Code debug config
│   └── tasks.json             # VS Code tasks
├── python-scheduler/
│   ├── Dockerfile             # Python image
│   ├── requirements.txt       # Python deps
│   ├── main.py               # Flask API
│   └── scheduler/
│       ├── ortools_optimizer.py  # OR-Tools (MAIN)
│       ├── greedy_scheduler.py   # Fallback
│       └── genetic_optimizer.py  # Fallback
└── src/
    └── lib/
        └── api/
            └── python-scheduler.ts  # TS Client
```

## 🎯 Next Steps

1. ✅ Uruchom `./start-dev.sh`
2. ✅ Uruchom `npm run dev`
3. ✅ Otwórz http://localhost:3000
4. ✅ Wygeneruj grafik - używa localhost:8080
5. ✅ Deploy na Cloud Run gdy gotowe
6. ✅ Zmień envs na produkcji

---

**Wersja**: 3.0.0-ortools
**Ostatnia aktualizacja**: 2026-01-29
