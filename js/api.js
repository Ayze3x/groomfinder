/**
 * js/api.js
 * Centralized API client for the AuraCraft backend
 * Handles JWT auth headers, JSON parsing, and offline fallback
 */

// ── Configuration ─────────────────────────────────────────
// In dev: backend runs on :5000, frontend on :5173
const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';
const JWT_KEY = 'gf_jwt';

// ── Token management ──────────────────────────────────────
export function getToken() {
    return localStorage.getItem(JWT_KEY);
}

export function setToken(token) {
    if (token) localStorage.setItem(JWT_KEY, token);
    else localStorage.removeItem(JWT_KEY);
}

export function clearToken() {
    localStorage.removeItem(JWT_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────
/**
 * apiFetch(path, options)
 * Makes an authenticated request to the backend.
 * Automatically adds Authorization: Bearer <jwt> header.
 *
 * Returns { data, ok, status, error }
 */
export async function apiFetch(path, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const config = {
        ...options,
        headers,
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_BASE}${path}`, config);
        let data;
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                error: data.error || `HTTP ${response.status}`,
                data,
            };
        }

        return { ok: true, status: response.status, data };
    } catch (err) {
        // Network error or backend offline
        console.warn('API fetch failed (backend may be offline):', err.message);
        return {
            ok: false,
            status: 0,
            error: 'Backend unreachable. Running in offline mode.',
            offline: true,
        };
    }
}

// ── Convenience methods ──────────────────────────────────
export const api = {
    get: (path, opts = {}) => apiFetch(path, { ...opts, method: 'GET' }),
    post: (path, body, opts = {}) => apiFetch(path, { ...opts, method: 'POST', body }),
    put: (path, body, opts = {}) => apiFetch(path, { ...opts, method: 'PUT', body }),
    delete: (path, opts = {}) => apiFetch(path, { ...opts, method: 'DELETE' }),
};

// ── Backend health check ──────────────────────────────────
export async function checkBackendHealth() {
    const { ok } = await api.get('/health');
    return ok;
}

export default api;
