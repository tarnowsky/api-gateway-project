FROM node:18-alpine

WORKDIR /app

# Skopiuj shared logger (bez instalacji dependencies)
COPY shared/logger /shared/logger

# Zainstaluj dependencies głównej aplikacji (tu jest winston)
COPY user-service/package*.json ./
RUN npm install

# Utworzenie katalogu na logi
RUN mkdir -p logs

# Kopiuj kod aplikacji user-service
COPY user-service/ .

EXPOSE 3001
CMD ["npm", "start"]