/**
 * Central API configuration.
 * Import this instead of hardcoding BASE_URL in every component.
 *
 * Usage:
 *   import { API_BASE, authHeaders, initCsrf } from '../../api/config';
 *   axios.get(`${API_BASE}/booking`, { headers: authHeaders(), withCredentials: true })
 */

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:4000/api'
    : 'https://sandigan-backend-api-gzdvgkcphtbbcngq.japaneast-01.azurewebsites.net/api';

/** Module-level CSRF token (fetched once at app startup). */
let _csrfToken = null;

/**
 * Fetches a fresh CSRF token from the server and stores it in memory.
 * Call this once when the app mounts (e.g., in App.jsx).
 */
const initCsrf = async () => {
    try {
        const res = await fetch(`${API_BASE}/csrf-token`, { credentials: 'include' });
        const data = await res.json();
        _csrfToken = data.csrfToken;
    } catch {
        console.warn('Could not fetch CSRF token. Mutating requests may fail.');
    }
};

/**
 * Returns headers for protected API calls.
 * The JWT is stored in an httpOnly cookie (automatically sent by the browser).
 * Use withCredentials: true (axios) or credentials: 'include' (fetch) to send cookies.
 */
const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(_csrfToken ? { 'X-CSRF-Token': _csrfToken } : {}),
});

export { API_BASE, authHeaders, initCsrf };
