import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AuthConfig = { url: string; key: string };
let authClientPromise: Promise<SupabaseClient> | null = null;

export async function loadAuthConfig(): Promise<AuthConfig> {
  const url: string | undefined = import.meta.env.VITE_SUPABASE_URL;
  const key: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) return { url, key };
  const response = await fetch('/api/auth-config', { cache: 'no-store' });
  if (import.meta.env.DEV && (response.headers.get('content-type') ?? '').includes('text/javascript')) {
    throw new Error('Account creation needs the Supabase connection.');
  }
  if (!response.ok) throw new Error(`Account connection unavailable (${response.status}).`);
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== 'object' || body === null || !('url' in body) || !('key' in body)
    || typeof body.url !== 'string' || typeof body.key !== 'string') {
    throw new Error('Account connection returned invalid settings.');
  }
  return { url: body.url, key: body.key };
}

export async function getAuthClient(): Promise<SupabaseClient> {
  if (!authClientPromise) {
    authClientPromise = loadAuthConfig().then(({ url, key }) => createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })).catch((cause: unknown) => {
      authClientPromise = null;
      throw cause;
    });
  }
  return authClientPromise;
}
