#!/bin/bash

# =============================================================================
# 🚀 Deploy Python Scheduler do Google Cloud Run
# =============================================================================
# Użycie: ./deploy.sh lub npm run deploy:python (z głównego folderu)
# =============================================================================

set -e

# Konfiguracja
PROJECT_ID="next-ecommerce-399010"
SERVICE_NAME="python-scheduler"
REGION="europe-west1"
API_KEY="schedule-saas-production-2026"

# Kolory
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🚀 Deploy Python Scheduler do Google Cloud Run${NC}"
echo "=================================================="
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region:  $REGION"
echo ""

# Sprawdź czy jesteśmy w dobrym folderze
if [ ! -f "Dockerfile" ]; then
    echo "❌ Błąd: Nie znaleziono Dockerfile. Uruchom skrypt z folderu python/"
    exit 1
fi

# Sprawdź czy Docker działa
if ! docker info > /dev/null 2>&1; then
    echo "❌ Błąd: Docker nie działa. Uruchom Docker Desktop."
    exit 1
fi

# 1. Build Docker image
echo -e "${GREEN}🔨 [1/3] Buduję Docker image...${NC}"
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/$SERVICE_NAME .

# 2. Push do GCR
echo ""
echo -e "${GREEN}📦 [2/3] Wysyłam image do Google Container Registry...${NC}"
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME

# 3. Deploy do Cloud Run
echo ""
echo -e "${GREEN}🚀 [3/3] Deploying do Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars API_KEY=$API_KEY \
  --memory 512Mi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0

# Sukces
echo ""
echo -e "${GREEN}✅ Deploy zakończony pomyślnie!${NC}"
echo ""

# Health check
SERVICE_URL="https://python-scheduler-155306113106.europe-west1.run.app"
echo "🔍 Sprawdzam health check..."
curl -s $SERVICE_URL/health | jq .

echo ""
echo "🌐 URL: $SERVICE_URL"
