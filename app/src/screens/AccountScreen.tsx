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
import { sendCode, signOut, verifyCode } from '../lib/auth';
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
        Zet je Supabase-gegevens in app/.env.local en start de app opnieuw. Zie de README. Tot die tijd
        bewaart Rondje je runs alleen op deze telefoon.
      </Text>
    </View>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanEmail = email.trim().toLowerCase();
  const validEmail = /^\S+@\S+\.\S+$/.test(cleanEmail);

  async function handleSend() {
    if (!validEmail) {
      setError('Vul een geldig e-mailadres in.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await sendCode(cleanEmail);
    setBusy(false);
    if (err) setError(`Versturen lukte niet. (${err})`);
    else setStep('code');
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    const err = await verifyCode(cleanEmail, code.trim());
    setBusy(false);
    if (err) setError(`Die code klopt niet of is verlopen. (${err})`);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Bewaar je rondjes</Text>
      <Text style={styles.text}>
        Log in om je runs veilig op te slaan. Ze blijven bewaard, ook als je van telefoon wisselt.
      </Text>

      {step === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="jij@voorbeeld.nl"
            placeholderTextColor="#8A94A3"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Button label="Stuur inlogcode" onPress={handleSend} busy={busy} small />
        </>
      ) : (
        <>
          <Text style={styles.text}>
            We hebben een code gestuurd naar <Text style={styles.strong}>{cleanEmail}</Text>.
          </Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
            placeholder="123456"
            placeholderTextColor="#8A94A3"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />
          <Button label="Inloggen" onPress={handleVerify} busy={busy} small />
          <Button
            label="Ander e-mailadres"
            variant="light"
            onPress={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
            small
          />
        </>
      )}

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
  strong: { fontFamily: fonts.tekstVet },
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
  codeInput: { fontFamily: fonts.kop, fontSize: 24, letterSpacing: 6, textAlign: 'center' },
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
