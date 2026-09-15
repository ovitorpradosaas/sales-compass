import type { Session } from '@supabase/supabase-js';

let cachedSession: Session | null | undefined;

export function getCachedSession() {
  return cachedSession;
}

export function setCachedSession(session: Session | null) {
  cachedSession = session;
}
