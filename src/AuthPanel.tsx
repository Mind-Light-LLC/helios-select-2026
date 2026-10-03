import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthClient } from '@api';
import { ActionTrail } from './ActionTrailPanel';
import { CloudSavedActions } from './CloudSavedActions';

type Mode = 'join' | 'sign-in';
type Props = { onClose: () => void };

export function AuthPanel({ onClose }: Props) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [mode, setMode] = useState<Mode>('join');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;
    getAuthClient().then(async (auth) => {
      if (!active) return;
      setClient(auth);
      const { data, error: authError } = await auth.auth.getUser();
      if (!active) return;
      setAccountEmail(authError ? null : data.user?.email ?? null);
      subscription = auth.auth.onAuthStateChange((event, session) => {
        if (active && event !== 'INITIAL_SESSION') setAccountEmail(session?.user.email ?? null);
      }).data.subscription;
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Account service unavailable.');
    });
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || busy) return;
    setError('');
    setMessage('');
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'join') {
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        setPassword('');
        if (data.session) setMessage('Your account is ready.');
        else setMessage('Check your email for the confirmation link. Your account is pending until confirmed.');
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        setPassword('');
        setMessage('Signed in.');
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Account request failed.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (!client || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await client.auth.signOut();
      if (authError) throw authError;
      setMessage('Signed out.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Sign out failed.');
    } finally { setBusy(false); }
  }

  return <aside className="auth-window" aria-label="Helios account">
    <div className="auth-head"><span>YOUR HELIOS ACCOUNT</span><button type="button" onClick={onClose} aria-label="Close account">×</button></div>
    {accountEmail ? <>
      <h2>You're signed in.</h2>
      <p className="auth-description">{accountEmail}</p>
      <button type="button" className="auth-primary" disabled={busy} onClick={() => void signOut()}>Sign out</button>
      <CloudSavedActions />
    </> : <>
      <h2>{mode === 'join' ? 'Join Helios.' : 'Welcome back.'}</h2>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="auth-email">Email</label>
        <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" type="password" required minLength={8} autoComplete={mode === 'join' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="auth-primary" type="submit" disabled={!client || busy}>{busy ? 'Working…' : mode === 'join' ? 'Create account' : 'Sign in'}</button>
      </form>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'join' ? 'sign-in' : 'join'); setError(''); setMessage(''); }}>{mode === 'join' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    </>}
    {message && <p className="auth-message" role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <ActionTrail />
  </aside>;
}
