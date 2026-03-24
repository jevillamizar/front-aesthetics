const TOKEN_KEY = 'auth_token';

export function getApiBase(): string {
  const env = (import.meta.env.VITE_API_BASE ?? '').trim();
  return env || `${window.location.protocol}//${window.location.hostname}:8000`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  return fetch(`${getApiBase()}${path}`, { ...options, headers });
}
