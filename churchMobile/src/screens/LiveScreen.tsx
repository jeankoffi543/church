import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLiveMessages, getLiveState, getRealtimePrefix, sendChatMessage, sendReaction } from '../api/church';
import { useAuth } from '../auth/AuthContext';
import { useActiveChurch } from '../church/ActiveChurchContext';
import { useLiveChannel } from '../live/echo';
import { Banner } from '../components/ui';
import { colors, radius } from '../theme';
import type { ChatMessage } from '../types';

const REACTIONS: { type: string; emoji: string }[] = [
  { type: 'heart', emoji: '❤️' },
  { type: 'flame', emoji: '🔥' },
  { type: 'hands', emoji: '🙏' },
  { type: 'dove', emoji: '🕊️' },
  { type: 'crown', emoji: '👑' },
];

export default function LiveScreen() {
  const { user } = useAuth();
  const { active } = useActiveChurch();
  const domain = active?.domain ?? null;

  const [prefix, setPrefix] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [audience, setAudience] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!domain) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [channelPrefix, liveState, history] = await Promise.all([
          getRealtimePrefix(domain),
          getLiveState(domain),
          getLiveMessages(domain),
        ]);
        if (!mounted) {
          return;
        }
        setPrefix(channelPrefix);
        setIsLive(liveState.isLive);
        setMessages(history.slice().reverse()); // newest-first for the inverted list
      } catch (err) {
        if (mounted) {
          setError((err as Error).message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [domain]);

  useLiveChannel(prefix, {
    onChat: msg => setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [msg, ...prev])),
    onReaction: r => setReactions(prev => ({ ...prev, [r.type]: r.total })),
    onAudience: setAudience,
    onLiveState: s => setIsLive(s.is_live),
  });

  const react = useCallback(
    (type: string) => {
      if (domain) {
        sendReaction(domain, type).catch(() => {});
      }
    },
    [domain],
  );

  const send = useCallback(() => {
    const body = text.trim();
    if (!domain || !body) {
      return;
    }
    setText('');
    sendChatMessage(domain, user?.name ?? 'Invité', body).catch(err => setError((err as Error).message));
  }, [domain, text, user?.name]);

  if (!active) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Aucune église suivie</Text>
        <Text style={styles.emptyBody}>Suivez une église pour rejoindre son live.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.indigo} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={90}>
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View style={[styles.dot, isLive ? styles.dotLive : styles.dotOff]} />
            <Text style={styles.statusText}>{isLive ? 'EN DIRECT' : 'Hors ligne'}</Text>
          </View>
          {audience !== null && <Text style={styles.audience}>{audience} en ligne</Text>}
        </View>

        {error && (
          <View style={styles.pad}>
            <Banner>{error}</Banner>
          </View>
        )}

        <View style={styles.reactions}>
          {REACTIONS.map(r => (
            <Pressable key={r.type} onPress={() => react(r.type)} style={styles.reaction}>
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              {reactions[r.type] ? <Text style={styles.reactionCount}>{reactions[r.type]}</Text> : null}
            </Pressable>
          ))}
        </View>

        <FlatList
          data={messages}
          inverted
          keyExtractor={m => String(m.id)}
          contentContainerStyle={styles.chat}
          ListEmptyComponent={<Text style={styles.chatEmpty}>Soyez le premier à écrire.</Text>}
          renderItem={({ item }) => (
            <View style={styles.msg}>
              <Text style={styles.msgAuthor}>{item.author_name}</Text>
              <Text style={styles.msgBody}>{item.message}</Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Votre message…"
            placeholderTextColor={colors.faint}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable onPress={send} disabled={!text.trim()} style={[styles.sendBtn, !text.trim() && styles.sendDisabled]}>
            <Text style={styles.sendText}>Envoyer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 24 },
  emptyTitle: { color: colors.indigo, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: colors.body, fontSize: 14, textAlign: 'center', marginTop: 6 },
  pad: { paddingHorizontal: 16, paddingTop: 8 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.ink,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLive: { backgroundColor: colors.live },
  dotOff: { backgroundColor: colors.faint },
  statusText: { color: colors.white, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  audience: { color: colors.cream, fontSize: 12 },
  reactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  reactionEmoji: { fontSize: 22 },
  reactionCount: { color: colors.body, fontSize: 13, fontWeight: '700' },
  chat: { padding: 16, gap: 8, flexGrow: 1 },
  chatEmpty: { color: colors.faint, textAlign: 'center', marginTop: 24, transform: [{ scaleY: -1 }] },
  msg: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 },
  msgAuthor: { color: colors.goldDark, fontSize: 12, fontWeight: '700' },
  msgBody: { color: colors.indigo, fontSize: 14, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.indigo,
    fontSize: 14,
  },
  sendBtn: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
});
