export const ADMIN_TOKEN_STORAGE_KEY = 'admin_auth_token';
export const ADMIN_AUTH_STORAGE_KEY = 'admin_authenticated';
export const ADMIN_UNAUTHORIZED_EVENT = 'admin-unauthorized';

/**
 * Error thrown for non-OK HTTP responses from the API client.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Checks whether an unknown error represents an HTTP 401 Unauthorized response.
 */
export function isUnauthorizedError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 401;
  }
  if (typeof err === 'object' && err !== null && 'status' in err) {
    return (err as { status?: unknown }).status === 401;
  }
  return false;
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage error
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}

export function isAdminSessionAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminSessionAuthenticated(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage error
  }
}

/**
 * Clears both the stored admin bearer token and the authenticated session flag.
 */
export function clearAdminSession(): void {
  clearAdminToken();
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}

/**
 * Clears the admin session and notifies active admin screens to return to login.
 */
export function notifyAdminUnauthorized(): void {
  clearAdminSession();
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
}

export function subscribeAdminUnauthorized(onUnauthorized: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onUnauthorized();
  window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handler);
  return () => {
    window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handler);
  };
}
