FROM node:18-alpine

WORKDIR /app

# Install Express Gateway globally
RUN npm install -g express-gateway

# Copy configuration files
COPY gateway.config.yml .
COPY system.config.yml .

EXPOSE 8080 9876

CMD ["eg", "gateway", "start"]