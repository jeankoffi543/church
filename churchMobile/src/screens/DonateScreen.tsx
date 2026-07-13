import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDonationStatus, initializeDonation } from '../api/church';
import { useAuth } from '../auth/AuthContext';
import { useActiveChurch } from '../church/ActiveChurchContext';
import { PaystackCheckout } from '../donate/PaystackCheckout';
import { Banner, Button, Field } from '../components/ui';
import { colors, radius } from '../theme';
import type { DonationInit } from '../types';

const PURPOSES = [
  { key: 'offering', label: 'Offrande' },
  { key: 'tithe', label: 'Dîme' },
  { key: 'donation', label: 'Don libre' },
];

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function DonateScreen() {
  const { user } = useAuth();
  const { active } = useActiveChurch();
  const domain = active?.domain ?? null;

  const [amount, setAmount] = useState('1000');
  const [purpose, setPurpose] = useState('offering');
  const [frequency, setFrequency] = useState<'unique' | 'mensuel'>('unique');
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [init, setInit] = useState<DonationInit | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [result, setResult] = useState<'success' | 'pending' | null>(null);

  const submit = async () => {
    const value = parseInt(amount, 10);
    if (!domain) {
      return;
    }
    if (!Number.isFinite(value) || value < 100) {
      setError('Le montant minimum est de 100.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Renseignez un email valide.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const created = await initializeDonation(domain, {
        donor_name: name.trim() || 'Anonyme',
        donor_email: email.trim(),
        purpose_key: purpose,
        amount: value,
        frequency,
      });
      setInit(created);
      setCheckoutVisible(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSuccess = async (reference: string) => {
    setCheckoutVisible(false);
    setBusy(true);
    let status = 'pending';
    for (let i = 0; i < 5 && domain; i++) {
      try {
        status = (await getDonationStatus(domain, reference)).status;
      } catch {
        // keep polling
      }
      if (status === 'success' || status === 'completed') {
        break;
      }
      await sleep(2000);
    }
    setBusy(false);
    setResult(status === 'success' || status === 'completed' ? 'success' : 'pending');
  };

  if (!active) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Aucune église suivie</Text>
        <Text style={styles.emptyBody}>Suivez une église pour faire un don.</Text>
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.resultEmoji}>{result === 'success' ? '🎉' : '⏳'}</Text>
        <Text style={styles.emptyTitle}>{result === 'success' ? 'Merci pour votre don !' : 'Paiement en traitement'}</Text>
        <Text style={styles.emptyBody}>
          {result === 'success'
            ? `Votre don à ${active.church} a bien été reçu.`
            : "Votre don sera confirmé sous peu. Merci pour votre générosité."}
        </Text>
        <View style={styles.resultBtn}>
          <Button label="Terminé" onPress={() => setResult(null)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Faire un don</Text>
          <Text style={styles.subtitle}>à {active.church}</Text>

          {error && <Banner>{error}</Banner>}

          <Field label="Montant" value={amount} onChangeText={setAmount} keyboardType="number-pad" />

          <Text style={styles.label}>Affectation</Text>
          <View style={styles.chips}>
            {PURPOSES.map(p => (
              <Pressable
                key={p.key}
                onPress={() => setPurpose(p.key)}
                style={[styles.chip, purpose === p.key && styles.chipActive]}>
                <Text style={[styles.chipText, purpose === p.key && styles.chipTextActive]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Fréquence</Text>
          <View style={styles.chips}>
            {(['unique', 'mensuel'] as const).map(f => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={[styles.chip, frequency === f && styles.chipActive]}>
                <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>
                  {f === 'unique' ? 'Unique' : 'Mensuel'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.gap} />
          <Field label="Votre nom" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />

          <Button label="Continuer vers le paiement" onPress={submit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>

      <PaystackCheckout
        init={init}
        visible={checkoutVisible}
        onSuccess={onSuccess}
        onCancel={() => setCheckoutVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 24 },
  content: { padding: 20 },
  title: { color: colors.indigo, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.body, fontSize: 14, marginTop: 2, marginBottom: 18 },
  label: { color: colors.indigo, fontWeight: '600', fontSize: 13, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.indigo, fontWeight: '600', fontSize: 14 },
  chipTextActive: { color: colors.ink },
  gap: { height: 4 },
  emptyTitle: { color: colors.indigo, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: colors.body, fontSize: 14, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  resultEmoji: { fontSize: 48, marginBottom: 8 },
  resultBtn: { marginTop: 20, alignSelf: 'stretch', paddingHorizontal: 24 },
});
