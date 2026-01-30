#!/bin/bash

# Skrypt do deploymentu na Google Cloud Run

set -e

# Konfiguracja
PROJECT_ID="next-ecommerce-399010"
SERVICE_NAME="python-scheduler"
REGION="europe-west1"

echo "🚀 Deployment Python Scheduler do Google Cloud Run"
echo "=================================================="
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Sprawdź czy Docker jest zainstalowany
if ! command -v docker &> /dev/null; then
    echo "❌ Błąd: Docker nie jest zainstalowany lub nie jest dostępny w PATH."
    echo "Zainstaluj Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Sprawdź czy Docker daemon działa
if ! docker info > /dev/null 2>&1; then
    echo "❌ Błąd: Docker daemon nie działa."
    echo "Uruchom Docker Desktop i spróbuj ponownie."
    exit 1
fi

# Sprawdź czy zalogowany do gcloud
echo "✓ Sprawdzam autoryzację..."
gcloud auth list

# Ustaw projekt
echo "✓ Ustawiam projekt..."
gcloud config set project $PROJECT_ID

# Build Docker image
echo "🔨 Buduję Docker image..."
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME .

# Push do Google Container Registry
echo "📦 Wysyłam image do GCR..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy do Cloud Run
echo "🚀 Deploying do Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars API_KEY=${API_KEY:-dev-key-change-in-production} \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0

# Pobierz URL
echo ""
echo "✅ Deployment zakończony!"
echo ""
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)')

echo "🌐 URL serwisu: $SERVICE_URL"
echo ""
echo "Test health check:"
echo "curl $SERVICE_URL/health"
echo ""
echo "Pamiętaj dodać do .env.local:"
echo "PYTHON_SCHEDULER_URL=$SERVICE_URL"
echo "PYTHON_SCHEDULER_API_KEY=your-secure-api-key"
