// api-gateway/public/src/js/test.js

const BASE_URL = 'http://localhost:8080';
let authToken = null;

// Utility: DOM selector shortcut
const $ = (selector) => document.querySelector(selector);

// UI: Update authentication status indicator and button states
function updateAuthStatus() {
    const statusDot = $('#authStatusDot');
    const statusText = $('#authStatusText');
    const authButtons = document.querySelectorAll('.test-button[id^="btn-"]');

    if (authToken) {
        statusDot.classList.add('authenticated');
        statusText.textContent = 'Authenticated ✓';
        authButtons.forEach(btn => btn.disabled = false);
    } else {
        statusDot.classList.remove('authenticated');
        statusText.textContent = 'Not Authenticated';
        authButtons.forEach(btn => btn.disabled = true);
    }
}

// UI: Update response display
function updateResponse(status, body, type) {
    $('#responseStatus').textContent = status;
    $('#responseStatus').className = `response-status status-${type}`;
    $('#responseBody').textContent = body;
}

// UI: Update request details
function updateRequestDetails(method, endpoint, options) {
    const details = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: options.headers,
        body: options.body ? JSON.parse(options.body) : null
    };
    $('#requestDetails').textContent = JSON.stringify(details, null, 2);
}

// UI: Clear response and request details
function clearResponse() {
    updateResponse('Ready', 'Ready to test endpoints...', 'ready');
    $('#requestDetails').textContent = 'No requests made yet';
}

// UI: Toggle form visibility
function toggleForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.classList.toggle('expanded');
}

// Auth: Register user
async function register() {
    const username = $('#username').value.trim();
    const password = $('#password').value.trim();
    const email = $('#email').value.trim();

    if (!username || !password || !email) {
        updateResponse('Error', 'Please fill in all fields for registration', 'error');
        return;
    }

    await makeRequest('POST', '/users/register', { username, password, email });
}

// Auth: Login user
async function login() {
    const username = $('#username').value.trim();
    const password = $('#password').value.trim();

    if (!username || !password) {
        updateResponse('Error', 'Please enter username and password', 'error');
        return;
    }

    const response = await makeRequest('POST', '/users/login', { username, password });
    if (response?.token) {
        authToken = response.token;
        updateAuthStatus();
        updateResponse('Success', 'Login successful! Token saved.', 'success');
    }
}

// Auth: Logout and clear token
function logout() {
    authToken = null;
    updateAuthStatus();
    updateResponse('Info', 'Logged out successfully', 'success');
}

function clearToken() {
    authToken = null;
    updateAuthStatus();
    updateResponse('Info', 'Token cleared', 'success');
}

// API: Make HTTP request
async function makeRequest(method, endpoint, data = null) {
    updateResponse('Pending', 'Making request...', 'pending');

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...(data && { body: JSON.stringify(data) })
    };

    updateRequestDetails(method, endpoint, options);

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const responseData = await response.json().catch(() => ({}));
        if (response.ok) {
            updateResponse(`${response.status} Success`, JSON.stringify(responseData, null, 2), 'success');
            return responseData;
        } else {
            updateResponse(`${response.status} Error`, JSON.stringify(responseData, null, 2), 'error');
        }
    } catch (error) {
        updateResponse('Network Error', error.message, 'error');
    }
}

// API: Test endpoint (optionally with JSON data)
async function testEndpoint(method, endpoint, dataFieldId = null) {
    let data = null;
    if (dataFieldId) {
        const dataField = document.getElementById(dataFieldId);
        console.log(dataField);
        try {
            data = JSON.parse(dataField.placeholder);
        } catch {
            updateResponse('Error', 'Invalid JSON data', 'error');
            return;
        }
    }
    await makeRequest(method, endpoint, data);
}

// API: Test endpoint with ID parameter
async function testEndpointWithId(method, basePath, idFieldId) {
    const id = document.getElementById(idFieldId).value.trim();
    if (!id) {
        updateResponse('Error', 'Please enter an ID', 'error');
        return;
    }
    console.log(`${basePath}/${id}`);
    await makeRequest(method, `${basePath}/${id}`);
}

// Event bindings
function bindEvents() {
    $('#logout')?.addEventListener('click', logout);
    $('#clear-token')?.addEventListener('click', clearToken);
    $('#register')?.addEventListener('click', register);
    $('#login')?.addEventListener('click', login);

    $('#btn-users-profile')?.addEventListener('click', () => testEndpoint('GET', '/users/profile'));
    $('#btn-users')?.addEventListener('click', () => testEndpoint('GET', '/users'));
    $('#btn-products-get')?.addEventListener('click', () => testEndpoint('GET', '/products'));
    $('#btn-products-post')?.addEventListener('click', () => toggleForm('product-create-form'));
    $('#create-product')?.addEventListener('click', () => testEndpoint('POST', '/products', 'productData'));
    $('#btn-products-get-id')?.addEventListener('click', () => toggleForm('product-get-form'));
    $('#get-product')?.addEventListener('click', () => testEndpointWithId('GET', '/products', 'productId'));
    $('#btn-orders-get')?.addEventListener('click', () => testEndpoint('GET', '/orders'));
    $('#btn-orders-post')?.addEventListener('click', () => toggleForm('order-create-form'));
    $('#create-order')?.addEventListener('click', () => testEndpoint('POST', '/orders', 'orderData'));
    $('#btn-orders-stats')?.addEventListener('click', () => testEndpoint('GET', '/orders/stats/summary'));
    $('#clear-btn')?.addEventListener('click', clearResponse);
}

// Initialize app
(function init() {
    updateAuthStatus();
    bindEvents();
})();
