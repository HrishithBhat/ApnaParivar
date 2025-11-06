// Centralized API base URL for frontend
// Configure VITE_API_URL in .env when deploying (e.g., https://api.yourdomain.com)
// Falls back to localhost:5000 for development.
export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:5000';

export function apiUrl(path = '/') {
  const base = API_BASE.replace(/\/$/, '');
  const p = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
