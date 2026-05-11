const TOKEN_KEY = 'auth_token';

export function getApiBase(): string {
  const env = (import.meta.env.VITE_API_BASE ?? '').trim();
  return env || window.location.origin;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options.body instanceof FormData;
  const url = `${getApiBase()}${path}`;

  // If body is FormData, let browser set Content-Type with boundary
  if (isFormData) {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // DO NOT set Content-Type - browser will set it with boundary for FormData
    return fetch(url, { ...options, headers });
  }

  const { headers = {}, ...rest } = options;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, { ...rest, headers });
}
