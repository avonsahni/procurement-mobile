import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ChannelList'>;

interface Channel {
  id: string;
  name: string;
  type: string | null;
  project_id: string | null;
}

export default function ChannelListScreen({ navigation }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChannels = useCallback(async () => {
    const { data } = await supabase
      .from('channels')
      .select('id, name, type, project_id')
      .is('archived_at', null)
      .order('name', { ascending: true });
    setChannels((data || []) as Channel[]);
  }, []);

  useEffect(() => {
    fetchChannels().finally(() => setLoading(false));
  }, [fetchChannels]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChannels();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  }

  return (
    <FlatList
      style={styles.list}
      alwaysBounceVertical
      contentContainerStyle={channels.length === 0 ? styles.emptyContainer : styles.listContent}
      data={channels}
      keyExtractor={c => c.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a5f" />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>No channels yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ThreadList', { channelId: item.id, channelName: item.name })}
        >
          <View style={styles.row}>
            <Text style={styles.hash}>#</Text>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {item.type ? (
              <View style={styles.typeTag}><Text style={styles.typeText}>{item.type}</Text></View>
            ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center' },
  hash: { fontSize: 18, fontWeight: '800', color: '#94a3b8', marginRight: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  typeTag: { backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '700', color: '#4f46e5' },
});
