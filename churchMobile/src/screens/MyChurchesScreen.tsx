import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useActiveChurch } from '../church/ActiveChurchContext';
import { colors, radius } from '../theme';
import type { AppTabParamList } from '../navigation/types';

const STATUS_LABEL: Record<string, string> = {
  follower: 'Abonné',
  member: 'Membre',
};

type Props = BottomTabScreenProps<AppTabParamList, 'MyChurches'>;

export default function MyChurchesScreen({ navigation }: Props) {
  const { churches, active, setActive, refresh } = useActiveChurch();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh().catch(() => {});
    setRefreshing(false);
  };

  const open = (tenantId: string) => {
    setActive(tenantId);
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <FlatList
        data={churches}
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
          <Pressable
            onPress={() => open(item.tenant_id)}
            style={[styles.card, item.tenant_id === active?.tenant_id && styles.cardActive]}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.church ?? 'Église'}</Text>
              {item.is_claimed && <Text style={styles.claimed}>Profil relié</Text>}
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
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
  cardActive: { borderColor: colors.gold, borderWidth: 2 },
  info: { flex: 1 },
  name: { color: colors.indigo, fontSize: 16, fontWeight: '700' },
  claimed: { color: colors.online, fontSize: 12, marginTop: 2, fontWeight: '600' },
  badge: { backgroundColor: 'rgba(40,25,80,0.06)', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  badgeText: { color: colors.indigo, fontSize: 12, fontWeight: '700' },
});
