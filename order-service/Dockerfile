FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock*.json ./
RUN npm install

# Create logs directory
RUN mkdir -p logs

# Copy application code
COPY . .

# Expose the service port
EXPOSE 3003

CMD ["npm", "start"]