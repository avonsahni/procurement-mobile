import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ThreadList'>;

interface Thread {
  id: string;
  title: string | null;
  message_count: number | null;
  last_message_at: string | null;
}

function formatTs(ts: string | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function ThreadListScreen({ navigation, route }: Props) {
  const { channelId, channelName } = route.params;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchThreads = useCallback(async () => {
    const { data } = await supabase
      .from('threads')
      .select('id, title, message_count, last_message_at')
      .eq('channel_id', channelId)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    setThreads((data || []) as Thread[]);
  }, [channelId]);

  useEffect(() => {
    fetchThreads().finally(() => setLoading(false));
  }, [fetchThreads]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchThreads();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  }

  return (
    <FlatList
      style={styles.list}
      alwaysBounceVertical
      contentContainerStyle={threads.length === 0 ? styles.emptyContainer : styles.listContent}
      data={threads}
      keyExtractor={t => t.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a5f" />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🧵</Text>
          <Text style={styles.emptyText}>No threads in this channel.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Thread', {
            threadId: item.id,
            channelId,
            channelName,
            threadTitle: item.title || 'Thread',
          })}
        >
          <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled thread'}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{item.message_count ?? 0} {(item.message_count ?? 0) === 1 ? 'message' : 'messages'}</Text>
            {item.last_message_at ? <Text style={styles.meta}>· {formatTs(item.last_message_at)}</Text> : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 12, paddingBottom: 48 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  title: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  meta: { fontSize: 12, color: '#94a3b8', marginRight: 6 },
});
