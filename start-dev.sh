#!/bin/bash

# =============================================================================
# SKRYPT STARTOWY DLA LOKALNEGO DEVELOPMENTU
# =============================================================================

echo "🚀 Uruchamianie Schedule SaaS - Development Environment"
echo ""

# Sprawdź czy Docker jest uruchomiony
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker nie jest uruchomiony. Uruchom Docker Desktop i spróbuj ponownie."
    exit 1
fi

echo "✅ Docker działa"
echo ""

# Uruchom Python Scheduler w Dockerze
echo "🐍 Uruchamianie Python Scheduler na http://localhost:8080..."
docker-compose up -d python-scheduler

# Poczekaj aż serwis się uruchomi
echo "⏳ Czekam na uruchomienie serwisu..."
sleep 5

# Sprawdź health check
echo "🏥 Sprawdzam health check..."
if curl -s http://localhost:8080/health | grep -q "healthy"; then
    echo "✅ Python Scheduler działa!"
    echo ""
    echo "📊 Status:"
    curl -s http://localhost:8080/health | python3 -m json.tool
else
    echo "⚠️  Python Scheduler nie odpowiada, sprawdź logi:"
    docker-compose logs python-scheduler
fi

echo ""
echo "🌐 Możesz teraz uruchomić Next.js:"
echo "   npm run dev"
echo ""
echo "📋 Przydatne komendy:"
echo "   docker-compose logs -f python-scheduler  # Logi live"
echo "   docker-compose down                      # Zatrzymaj wszystko"
echo "   docker-compose restart python-scheduler  # Restart"
echo ""
