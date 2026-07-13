import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { Banner, Button, Field } from '../components/ui';
import { colors } from '../theme';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
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
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Retrouvez toutes vos églises en un seul endroit.</Text>

          {error && <Banner>{error}</Banner>}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />

          <Button label="Se connecter" onPress={submit} loading={busy} />

          <Pressable onPress={() => navigation.navigate('Register')} style={styles.link}>
            <Text style={styles.linkText}>
              Pas encore de compte ? <Text style={styles.linkStrong}>Créer un compte</Text>
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
