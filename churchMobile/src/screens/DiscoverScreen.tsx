import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { discoverChurches, followChurch, unfollowChurch } from '../api/identity';
import { useAuth } from '../auth/AuthContext';
import { Banner } from '../components/ui';
import { colors, radius } from '../theme';
import type { Church } from '../types';

export default function DiscoverScreen() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      if (!token) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        setChurches(await discoverChurches(token, q));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(query), 350);
    return () => clearTimeout(timer);
  }, [query, load]);

  const toggleFollow = async (church: Church) => {
    if (!token || pendingId) {
      return;
    }
    setPendingId(church.id);
    try {
      if (church.following) {
        await unfollowChurch(token, church.id);
      } else {
        await followChurch(token, church.id);
      }
      setChurches(prev => prev.map(c => (c.id === church.id ? { ...c, following: !c.following } : c)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une église…"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          style={styles.search}
        />
      </View>

      {error && (
        <View style={styles.pad}>
          <Banner>{error}</Banner>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.indigo} />
      ) : (
        <FlatList
          data={churches}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Aucune église trouvée.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.domain}>{item.domain ?? `${item.slug}.churchapp.io`}</Text>
              </View>
              <Pressable
                onPress={() => toggleFollow(item)}
                disabled={pendingId === item.id}
                style={[styles.followBtn, item.following ? styles.following : styles.notFollowing]}>
                {pendingId === item.id ? (
                  <ActivityIndicator color={item.following ? colors.indigo : colors.ink} />
                ) : (
                  <Text style={item.following ? styles.followingText : styles.notFollowingText}>
                    {item.following ? 'Suivi ✓' : 'Suivre'}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  searchWrap: { padding: 16, paddingBottom: 8 },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.indigo,
    fontSize: 15,
  },
  pad: { paddingHorizontal: 16 },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingTop: 8, gap: 10 },
  empty: { textAlign: 'center', color: colors.faint, marginTop: 40, fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
  },
  info: { flex: 1, paddingRight: 12 },
  name: { color: colors.indigo, fontSize: 16, fontWeight: '700' },
  domain: { color: colors.faint, fontSize: 12, marginTop: 2 },
  followBtn: { borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 16, minWidth: 88, alignItems: 'center' },
  notFollowing: { backgroundColor: colors.gold },
  following: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  notFollowingText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  followingText: { color: colors.indigo, fontWeight: '700', fontSize: 13 },
});
