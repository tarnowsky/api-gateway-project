FROM node:18-alpine

WORKDIR /app

# Skopiuj shared logger (bez instalacji dependencies)
COPY shared/logger /shared/logger

# Zainstaluj dependencies głównej aplikacji (tu jest winston)
COPY product-service/package*.json ./
RUN npm install

# Utworzenie katalogu na logi
RUN mkdir -p logs

# Kopiuj kod aplikacji product-service
COPY product-service/ .

EXPOSE ${PORT_PRODUCT}
CMD ["npm", "start"]