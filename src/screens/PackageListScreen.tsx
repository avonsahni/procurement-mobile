import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Package } from '../lib/types';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'PackageList'>;

const STAGE_COLORS: Record<string, string> = {
  'Award': '#16a34a',
  'Commercial Negotiation': '#2563eb',
  'Technical Negotiation': '#7c3aed',
  'RFQ Float': '#d97706',
  'Spec Received': '#64748b',
};

export default function PackageListScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPackages = useCallback(async () => {
    const { data } = await supabase
      .from('packages')
      .select('id, project_id, name, description, currency, current_stage, award_value')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setPackages(
      (data || []).map((p: any) => ({
        id: p.id,
        projectId: p.project_id,
        name: p.name,
        description: p.description || '',
        currency: p.currency || 'INR',
        currentStage: p.current_stage,
        awardValue: Number(p.award_value) || 0,
      }))
    );
  }, [projectId]);

  useEffect(() => {
    fetchPackages().finally(() => setLoading(false));
  }, [fetchPackages]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPackages();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={packages.length === 0 ? styles.emptyContainer : styles.listContent}
      data={packages}
      keyExtractor={p => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>No packages found.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const stageColor = (item.currentStage && STAGE_COLORS[item.currentStage]) || '#64748b';
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('PackageDashboard', { packageId: item.id, packageName: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.cardRow}>
              <Text style={styles.packageName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.currencyTag}>
                <Text style={styles.currencyText}>{item.currency}</Text>
              </View>
            </View>
            {item.currentStage ? (
              <View style={[styles.stageBadge, { backgroundColor: stageColor + '18' }]}>
                <Text style={[styles.stageText, { color: stageColor }]}>{item.currentStage}</Text>
              </View>
            ) : null}
            {item.description ? (
              <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
            ) : null}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageName: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  currencyTag: { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  currencyText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  stageBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  stageText: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
});
