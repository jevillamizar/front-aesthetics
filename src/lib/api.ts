const TOKEN_KEY = 'auth_token';

export function getApiBase(): string {
  const env = (import.meta.env.VITE_API_BASE ?? '').trim();
  return env || window.location.origin;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options.body instanceof FormData;

  if (isFormData) {
    const { headers: _ignored, ...restOptions } = options as Record<string, unknown>;
    void _ignored;
    const req = new Request(`${getApiBase()}${path}`, {
      ...restOptions,
    });
    if (token) req.headers.append('Authorization', `Bearer ${token}`);
    return fetch(req);
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${getApiBase()}${path}`, { ...options, headers });
}
