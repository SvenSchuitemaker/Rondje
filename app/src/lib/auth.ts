import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

export const MIN_PASSWORD_LENGTH = 8;

/** Huidige sessie; undefined zolang die nog geladen wordt. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}

/** Supabase-foutmeldingen in gewone taal. */
function dutch(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mailadres of wachtwoord klopt niet.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Dit e-mailadres heeft al een account. Log in.';
  if (m.includes('password should be') || m.includes('weak password'))
    return `Kies een wachtwoord van minstens ${MIN_PASSWORD_LENGTH} tekens.`;
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Te veel pogingen. Wacht even en probeer het opnieuw.';
  if (m.includes('network') || m.includes('fetch')) return 'Geen verbinding. Probeer het later nog eens.';
  return message;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Supabase is niet ingesteld.';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? dutch(error.message) : null;
}

export async function signUp(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Supabase is niet ingesteld.';
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return dutch(error.message);
  // Bestaat het adres al, dan geeft Supabase geen fout maar een gebruiker zonder identiteiten.
  if (data.user && data.user.identities?.length === 0) return dutch('already registered');
  if (!data.session) return 'Account gemaakt. Log nu in.';
  return null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
