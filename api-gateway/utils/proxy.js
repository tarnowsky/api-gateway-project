/**
 * Narzędzia pomocnicze do obsługi proxy
 */
const http = require('http');
const https = require('https');
const axios = require('axios');
const logger = require('./logger');

/**
 * Funkcja sprawdzająca stan usługi (health check)
 * @param {string} serviceUrl - Adres URL usługi
 * @param {string} healthCheckPath - Ścieżka endpoint'u health check
 * @return {Promise<boolean>} - Czy usługa jest dostępna
 */
async function checkServiceHealth(serviceUrl, healthCheckPath) {
  try {
    const url = `${serviceUrl}${healthCheckPath}`;
    const response = await axios.get(url, {
      timeout: 5000, // 5 sekund timeout
      validateStatus: null // akceptuj wszystkie kody statusu
    });
    
    return response.status === 200;
  } catch (error) {
    logger.error(`Błąd health check dla ${serviceUrl}:`, error.message);
    return false;
  }
}

/**
 * Funkcja do wykonania żądania proxy
 * @param {Object} options - Opcje żądania
 * @param {Object} requestData - Dane żądania (body)
 * @return {Promise<Object>} - Odpowiedź z usługi
 */
function proxyRequest(options, requestData = null) {
  return new Promise((resolve, reject) => {
    // Wybór protokołu na podstawie URL
    const httpLib = options.protocol === 'https:' ? https : http;
    
    const req = httpLib.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : {}
          };
          resolve(response);
        } catch (error) {
          logger.error('Błąd parsowania odpowiedzi:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      logger.error('Błąd żądania proxy:', error);
      reject(error);
    });
    
    // Obsługa timeoutu
    req.setTimeout(30000, () => {
      req.abort();
      reject(new Error('Timeout żądania'));
    });
    
    // Wysłanie danych, jeśli są dostarczone
    if (requestData) {
      req.write(JSON.stringify(requestData));
    }
    
    req.end();
  });
}

module.exports = {
  checkServiceHealth,
  proxyRequest
};