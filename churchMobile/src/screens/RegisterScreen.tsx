import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { Banner, Button, Field } from '../components/ui';
import { colors } from '../theme';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) {
      return;
    }
    setError(null);
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    setBusy(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>✦ ChurchApp</Text>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Un seul compte pour suivre toutes vos églises.</Text>

          {error && <Banner>{error}</Banner>}

          <Field label="Nom complet" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
          <Field label="Téléphone (facultatif)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />

          <Button label="Créer mon compte" onPress={submit} loading={busy} />

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.link}>
            <Text style={styles.linkText}>
              Déjà un compte ? <Text style={styles.linkStrong}>Se connecter</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 48, flexGrow: 1, justifyContent: 'center' },
  brand: { color: colors.indigo, fontSize: 20, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  title: { color: colors.indigo, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.body, fontSize: 14, marginTop: 4, marginBottom: 20 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.body, fontSize: 14 },
  linkStrong: { color: colors.goldDark, fontWeight: '700' },
});
