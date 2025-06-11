FROM node:18-alpine

WORKDIR /app

# Skopiuj shared logger (bez instalacji dependencies)
COPY shared/logger /shared/logger

# Zainstaluj dependencies głównej aplikacji (tu jest winston)
COPY order-service/package*.json ./
RUN npm install

# Utworzenie katalogu na logi
RUN mkdir -p logs

# Kopiuj kod aplikacji order-service
COPY order-service/ .

EXPOSE ${PORT_ORDER}
CMD ["npm", "start"]