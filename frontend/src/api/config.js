/**
 * Central API configuration.
 * Import this instead of hardcoding BASE_URL in every component.
 *
 * Usage:
 *   import { API_BASE, authHeaders } from '../../api/config';
 *   axios.get(`${API_BASE}/booking`, { headers: authHeaders() })
 */

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:4000/api'
    : 'https://sandigan-backend-api-gzdvgkcphtbbcngq.japaneast-01.azurewebsites.net/api';

/**
 * Returns authorization headers with the stored JWT token.
 * Use this for any protected API call (employee dashboard, etc.)
 */
const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export { API_BASE, authHeaders };
