#!/bin/bash

# Skrypt do debugowania problemów z API Gateway i mikrousługami

echo "======= DEBUGOWANIE API GATEWAY i MIKROUSŁUG ======="
echo

# Sprawdzenie czy Docker działa
echo "1. Sprawdzanie statusu Docker..."
if ! docker info > /dev/null 2>&1; then
  echo "Docker nie jest uruchomiony. Proszę uruchomić Docker."
  exit 1
else
  echo "Docker działa poprawnie."
fi
echo

# Sprawdzenie kontenerów
echo "2. Sprawdzanie statusu kontenerów..."
docker ps -a
echo

# Sprawdzenie logów API Gateway
echo "3. Sprawdzanie logów API Gateway (ostatnie 20 linii)..."
docker logs api-gateway --tail 20
echo

# Sprawdzenie logów User Service
echo "4. Sprawdzanie logów User Service (ostatnie 20 linii)..."
docker logs user-service --tail 20
echo

# Sprawdzenie połączenia między kontenerami
echo "5. Testowanie połączenia z API Gateway do User Service..."
docker exec api-gateway ping -c 2 user-service
echo

# Sprawdzenie czasów w kontenerach
echo "6. Sprawdzanie czasów w kontenerach..."
echo "Czas systemowy:"
date
echo "Czas w API Gateway:"
docker exec api-gateway date
echo "Czas w User Service:"
docker exec user-service date
echo

# Sprawdzenie konfiguracji sieci Docker
echo "7. Sprawdzanie konfiguracji sieci Docker..."
docker network inspect microservice-network
echo

# Testowanie endpointów
echo "8. Testowanie endpointu health API Gateway..."
curl -v http://localhost:8080/health
echo
echo

echo "9. Testowanie endpointu health User Service przez API Gateway..."
curl -v http://localhost:8080/users/health
echo
echo

echo "10. Testowanie bezpośrednio endpointu User Service (jeśli port jest wystawiony)..."
# Sprawdzenie czy port 3001 jest wystawiony
if docker port user-service | grep -q "3001"; then
  EXPOSED_PORT=$(docker port user-service | grep "3001" | cut -d ":" -f2)
  curl -v http://localhost:$EXPOSED_PORT/users/health
else
  echo "Port user-service (3001) nie jest wystawiony na hosta."
fi
echo

echo "===== WSZYSTKIE TESTY ZAKOŃCZONE ====="