import type { Session } from '@supabase/supabase-js';

let cachedSession: Session | null | undefined;

function readPersistedSession(): Session | null {
  if (typeof window === 'undefined') return null;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<Session> & { user?: Session['user'] };
      if (!parsed.access_token || !parsed.refresh_token || !parsed.user) continue;
      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        user: parsed.user,
        expires_at: parsed.expires_at,
        expires_in: parsed.expires_in,
        token_type: parsed.token_type ?? 'bearer',
      } as Session;
    } catch {
      // Ignore malformed or unrelated localStorage entries.
    }
  }
  return null;
}

export function getCachedSession() {
  if (cachedSession !== undefined) return cachedSession;
  cachedSession = readPersistedSession();
  return cachedSession;
}

export function setCachedSession(session: Session | null) {
  cachedSession = session;
}
