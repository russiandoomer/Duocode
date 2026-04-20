function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)) {
    return '';
  }

  return 'http://localhost:3001';
}

function getConnectionHelpMessage() {
  if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)) {
    return 'La app no tiene configurada la API de produccion. Define `EXPO_PUBLIC_API_URL` en Vercel apuntando a Railway.';
  }

  return 'No se pudo conectar con la API. Verifica que `npm run local:api` este ejecutandose en localhost:3001.';
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers || {});
  const baseUrl = getApiBaseUrl();

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!baseUrl) {
    throw new Error(getConnectionHelpMessage());
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(getConnectionHelpMessage());
  }

  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : 'Request failed';
    throw new Error(message || 'Request failed');
  }

  return data as T;
}
