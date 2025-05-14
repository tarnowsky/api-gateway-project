# Bazowy obraz
FROM node:18-alpine

# Instalacja globalna dla nodemon dla wygodniejszego developmentu
RUN npm install -g nodemon

# Ustawienie katalogu roboczego
WORKDIR /usr/src/app

# Kopiowanie plików package.json i package-lock.json
COPY package*.json ./

# Instalacja zależności
RUN npm install

# Kopiowanie kodu źródłowego
COPY . .

# Utworzenie katalogu na logi
RUN mkdir -p logs

# Ustawienie zmiennych środowiskowych
ENV NODE_ENV=production
ENV PORT=8080

# Ekspozycja portu
EXPOSE 8080

# Uruchomienie aplikacji
CMD ["node", "index.js"]