import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getLiveState, getUpcomingEvents } from '../api/church';
import { useActiveChurch } from '../church/ActiveChurchContext';
import { Banner } from '../components/ui';
import { colors, radius } from '../theme';
import type { AppStackParamList } from '../navigation/types';
import type { ChurchEvent, LiveState } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function ChurchHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { loading, active, churches, setActive } = useActiveChurch();
  const [live, setLive] = useState<LiveState | null>(null);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const load = useCallback(async (domain: string | null) => {
    if (!domain) {
      return;
    }
    setContentLoading(true);
    setError(null);
    try {
      const [liveState, upcoming] = await Promise.all([getLiveState(domain), getUpcomingEvents(domain)]);
      setLive(liveState);
      setEvents(upcoming);
    } catch (err) {
      setError((err as Error).message);
      setLive(null);
      setEvents([]);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    load(active?.domain ?? null);
  }, [active?.domain, load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.indigo} />
      </SafeAreaView>
    );
  }

  if (!active) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Aucune église suivie</Text>
        <Text style={styles.emptyBody}>Rendez-vous dans « Découvrir » pour suivre votre église.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => churches.length > 1 && setSwitcherOpen(true)}
          style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.churchName}>{active.church}</Text>
            <Text style={styles.churchDomain}>{active.domain}</Text>
          </View>
          {churches.length > 1 && <Text style={styles.switch}>Changer ▾</Text>}
        </Pressable>

        {error && <Banner>{error}</Banner>}

        {live?.isLive ? (
          <View style={styles.liveCard}>
            <Text style={styles.liveDot}>● EN DIRECT</Text>
            <Text style={styles.liveTitle}>{live.title ?? 'Le culte est en direct'}</Text>
          </View>
        ) : (
          <View style={styles.offlineCard}>
            <Text style={styles.offlineText}>Pas de diffusion en cours.</Text>
          </View>
        )}

        <Pressable onPress={() => navigation.navigate('Donate')} style={styles.donateBtn}>
          <Text style={styles.donateText}>♡  Faire un don</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>À venir</Text>
        {contentLoading ? (
          <ActivityIndicator color={colors.indigo} style={styles.loader} />
        ) : events.length === 0 ? (
          <Text style={styles.empty}>Aucun événement à venir.</Text>
        ) : (
          events.slice(0, 6).map(event => (
            <View key={event.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>
                {formatDate(event.starts_at)}
                {event.location ? ` · ${event.location}` : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={switcherOpen} transparent animationType="fade" onRequestClose={() => setSwitcherOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSwitcherOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Changer d'église</Text>
            {churches.map(church => (
              <Pressable
                key={church.tenant_id}
                onPress={() => {
                  setActive(church.tenant_id);
                  setSwitcherOpen(false);
                }}
                style={styles.sheetRow}>
                <Text style={[styles.sheetRowText, church.tenant_id === active.tenant_id && styles.sheetRowActive]}>
                  {church.church}
                </Text>
                {church.tenant_id === active.tenant_id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 24 },
  emptyTitle: { color: colors.indigo, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: colors.body, fontSize: 14, textAlign: 'center', marginTop: 6 },
  content: { padding: 16, gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 8,
  },
  headerInfo: { flex: 1, paddingRight: 12 },
  churchName: { color: colors.indigo, fontSize: 20, fontWeight: '700' },
  churchDomain: { color: colors.faint, fontSize: 12, marginTop: 2 },
  switch: { color: colors.goldDark, fontWeight: '700', fontSize: 13 },
  liveCard: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: 16, marginBottom: 8 },
  liveDot: { color: colors.live, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  liveTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 4 },
  offlineCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 8,
  },
  offlineText: { color: colors.body, fontSize: 14 },
  donateBtn: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  donateText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: colors.indigo, fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  loader: { marginTop: 16 },
  empty: { color: colors.faint, fontSize: 14, marginTop: 8 },
  eventCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
  },
  eventTitle: { color: colors.indigo, fontSize: 15, fontWeight: '700' },
  eventMeta: { color: colors.faint, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  backdrop: { flex: 1, backgroundColor: 'rgba(22,15,51,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  sheetTitle: { color: colors.indigo, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  sheetRowText: { color: colors.body, fontSize: 16 },
  sheetRowActive: { color: colors.indigo, fontWeight: '700' },
  check: { color: colors.online, fontSize: 16, fontWeight: '700' },
});
