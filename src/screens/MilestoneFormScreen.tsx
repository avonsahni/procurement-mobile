import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { MILESTONE_NAMES } from '../lib/types';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'MilestoneForm'>;

interface MilestoneTask {
  id: string;
  milestone_name: string;
  progress: number;
}

export default function MilestoneFormScreen({ navigation, route }: Props) {
  const { packageId, orgId, userName } = route.params;
  const [tasks, setTasks] = useState<MilestoneTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('milestone_tasks')
      .select('id, milestone_name, progress')
      .eq('package_id', packageId);
    setTasks((data || []) as MilestoneTask[]);
  }, [packageId]);

  // Refetch every time the screen regains focus (e.g. after returning from detail).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchTasks().finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [fetchTasks])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  // One card per milestone (all of them, in canonical order) with count + average progress.
  const milestoneCards = MILESTONE_NAMES.map(m => {
    const items = tasks.filter(t => t.milestone_name === m);
    const avg = items.length
      ? Math.round(items.reduce((sum, t) => sum + (t.progress || 0), 0) / items.length)
      : 0;
    return { milestone: m, count: items.length, avg };
  });

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      alwaysBounceVertical
      showsVerticalScrollIndicator
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
    >
      {milestoneCards.map(card => (
        <TouchableOpacity
          key={card.milestone}
          style={styles.msCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('MilestoneDetail', {
            packageId, orgId, userName, milestoneName: card.milestone,
          })}
        >
          <View style={styles.msHeaderRow}>
            <Text style={styles.msName} numberOfLines={1}>{card.milestone}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.msMetaRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {card.count} {card.count === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
          </View>

          <View style={styles.msProgressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${card.avg}%` }]} />
            </View>
            <Text style={styles.msAvg}>{card.avg}%</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, paddingBottom: 48, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  msCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  msHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  msName: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  chevron: { fontSize: 24, color: '#cbd5e1', fontWeight: '300', marginTop: -2 },
  msMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  countBadge: { backgroundColor: '#ede9fe', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  msProgressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  msAvg: { fontSize: 12, fontWeight: '700', color: '#7c3aed', marginLeft: 10, width: 38, textAlign: 'right' },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#ede9fe', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#7c3aed' },
});
