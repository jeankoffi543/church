import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMemberships } from '../api/identity';
import { useAuth } from '../auth/AuthContext';
import { Banner } from '../components/ui';
import { colors, radius } from '../theme';
import type { Membership } from '../types';

const STATUS_LABEL: Record<string, string> = {
  follower: 'Abonné',
  member: 'Membre',
};

export default function MyChurchesScreen() {
  const { token } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      setMemberships(await getMemberships(token));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.center}>
        <ActivityIndicator color={colors.indigo} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      {error && (
        <View style={styles.pad}>
          <Banner>{error}</Banner>
        </View>
      )}
      <FlatList
        data={memberships}
        keyExtractor={m => m.tenant_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Aucune église suivie</Text>
            <Text style={styles.emptyBody}>Rendez-vous dans « Découvrir » pour suivre votre église.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.church ?? 'Église'}</Text>
              {item.is_claimed && <Text style={styles.claimed}>Profil relié</Text>}
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  pad: { paddingHorizontal: 16, paddingTop: 12 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  emptyWrap: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyTitle: { color: colors.indigo, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: colors.body, fontSize: 14, textAlign: 'center', marginTop: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
  },
  info: { flex: 1 },
  name: { color: colors.indigo, fontSize: 16, fontWeight: '700' },
  claimed: { color: colors.online, fontSize: 12, marginTop: 2, fontWeight: '600' },
  badge: { backgroundColor: 'rgba(40,25,80,0.06)', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  badgeText: { color: colors.indigo, fontSize: 12, fontWeight: '700' },
});
