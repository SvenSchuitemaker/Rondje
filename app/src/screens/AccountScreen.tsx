import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand } from '../components/Brand';
import { Button } from '../components/Button';
import { MIN_PASSWORD_LENGTH, signIn, signOut, signUp } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';

export type SyncStatus =
  | { state: 'idle'; at?: number }
  | { state: 'busy' }
  | { state: 'error'; message: string };

type Props = {
  session: Session | null | undefined;
  sync: SyncStatus;
  onSync: () => void;
};

export function AccountScreen({ session, sync, onSync }: Props) {
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Brand subtitle="Account" />
        <View style={styles.body}>
          {!supabase ? (
            <NotConfigured />
          ) : session === undefined ? (
            <ActivityIndicator color={colors.nachtblauw} />
          ) : session ? (
            <SignedIn email={session.user.email ?? ''} sync={sync} onSync={onSync} />
          ) : (
            <SignIn />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NotConfigured() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nog niet gekoppeld</Text>
      <Text style={styles.text}>
        Er zijn geen Supabase-gegevens ingesteld. Rondje bewaart je runs nu alleen op deze telefoon.
      </Text>
    </View>
  );
}

function SignIn() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanEmail = email.trim().toLowerCase();

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Vul een geldig e-mailadres in.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Je wachtwoord heeft minstens ${MIN_PASSWORD_LENGTH} tekens.`);
      return;
    }
    setBusy(true);
    setError(null);
    const err = mode === 'login' ? await signIn(cleanEmail, password) : await signUp(cleanEmail, password);
    setBusy(false);
    if (err) setError(err);
  }

  const isLogin = mode === 'login';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{isLogin ? 'Log in' : 'Maak een account'}</Text>
      <Text style={styles.text}>
        Bewaar je runs veilig online. Ze blijven bewaard, ook als je van telefoon wisselt.
      </Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="jij@voorbeeld.nl"
        placeholderTextColor="#8A94A3"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType={isLogin ? 'username' : 'emailAddress'}
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder={isLogin ? 'Wachtwoord' : `Wachtwoord (minstens ${MIN_PASSWORD_LENGTH} tekens)`}
        placeholderTextColor="#8A94A3"
        secureTextEntry
        autoCapitalize="none"
        autoComplete={isLogin ? 'current-password' : 'new-password'}
        textContentType={isLogin ? 'password' : 'newPassword'}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button label={isLogin ? 'Inloggen' : 'Account maken'} onPress={submit} busy={busy} small />
      <Button
        label={isLogin ? 'Nog geen account? Maak er een' : 'Al een account? Log in'}
        variant="light"
        onPress={() => {
          setMode(isLogin ? 'signup' : 'login');
          setError(null);
        }}
        small
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function SignedIn({ email, sync, onSync }: { email: string; sync: SyncStatus; onSync: () => void }) {
  let status = 'Nog niet gesynchroniseerd.';
  if (sync.state === 'busy') status = 'Bezig met synchroniseren…';
  else if (sync.state === 'error') status = `Synchroniseren lukte niet. (${sync.message})`;
  else if (sync.at) {
    const d = new Date(sync.at);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    status = `Alles bijgewerkt om ${hh}:${mm}.`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Ingelogd als</Text>
      <Text style={styles.title}>{email}</Text>
      <Text style={[styles.text, sync.state === 'error' && styles.errorText]}>{status}</Text>
      <Button label="Nu synchroniseren" onPress={onSync} busy={sync.state === 'busy'} small />
      <Button label="Uitloggen" variant="light" onPress={() => signOut()} small />
      <Text style={styles.footnote}>Na uitloggen blijven je runs op deze telefoon staan.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  body: { marginTop: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ochtendmist,
    padding: 18,
    gap: 12,
  },
  label: {
    fontFamily: fonts.tekstMedium,
    fontSize: 12,
    color: colors.nachtblauw,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { fontFamily: fonts.kop, fontSize: 22, color: colors.nachtblauw },
  text: { fontFamily: fonts.tekst, fontSize: 15, lineHeight: 21, color: colors.nachtblauw },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.papier,
    borderWidth: 1,
    borderColor: colors.ochtendmist,
    paddingHorizontal: 16,
    fontFamily: fonts.tekst,
    fontSize: 17,
    color: colors.nachtblauw,
  },
  error: {
    fontFamily: fonts.tekst,
    fontSize: 14,
    color: colors.nachtblauw,
    backgroundColor: colors.ochtendmist,
    padding: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  errorText: { color: colors.sprintoranje },
  footnote: { fontFamily: fonts.tekst, fontSize: 13, color: colors.nachtblauw, opacity: 0.6 },
});
