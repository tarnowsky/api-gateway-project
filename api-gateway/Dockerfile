FROM node:18-alpine

# Instalacja globalna dla nodemon
RUN npm install -g nodemon

# Ustawienie katalogu roboczego
WORKDIR /app

# Skopiuj shared logger (bez instalacji dependencies)
COPY shared/logger /shared/logger

# Zainstaluj dependencies głównej aplikacji (tu jest winston)
COPY api-gateway/package*.json ./
RUN npm install

# Kopiuj kod aplikacji api-gateway
COPY api-gateway/ .

# Utworzenie katalogu na logi
RUN mkdir -p logs

ENV NODE_ENV=development
ENV PORT=8080

EXPOSE 8080
CMD ["node", "index.js"]