import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DashboardData, formatAmount } from '../lib/types';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'PackageDashboard'>;

export default function PackageDashboardScreen({ navigation, route }: Props) {
  const { packageId } = route.params;
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    const [pkgRes, invoicesRes, inflowRes, outflowRes, tasksRes] = await Promise.all([
      supabase.from('packages')
        .select('name, currency, current_stage, award_value')
        .eq('id', packageId)
        .maybeSingle(),
      supabase.from('invoices').select('amount').eq('package_id', packageId),
      supabase.from('cash_inflow').select('amount').eq('package_id', packageId),
      supabase.from('cash_outflow').select('amount').eq('package_id', packageId),
      supabase.from('milestone_tasks').select('progress').eq('package_id', packageId),
    ]);

    if (!pkgRes.data) return;

    const sum = (rows: any[]) => rows.reduce((s, r) => s + Number(r.amount), 0);
    const billedTotal  = sum(invoicesRes.data || []);
    const inflowTotal  = sum(inflowRes.data  || []);
    const outflowTotal = sum(outflowRes.data || []);
    const tasks = tasksRes.data || [];
    const milestoneProgress = tasks.length
      ? Math.round(tasks.reduce((s: number, t: any) => s + Number(t.progress), 0) / tasks.length)
      : 0;
    const awardValue = Number(pkgRes.data.award_value) || 0;

    setData({
      name: pkgRes.data.name,
      currency: pkgRes.data.currency || 'INR',
      currentStage: pkgRes.data.current_stage,
      awardValue,
      billedTotal,
      inflowTotal,
      outflowTotal,
      balance: awardValue - billedTotal,
      milestoneProgress,
    });
  }, [packageId]);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  if (loading || !data) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  const cy   = data.currency;
  const name = user?.fullName || user?.email || '';
  const orgId = user?.orgId || '';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      alwaysBounceVertical
      showsVerticalScrollIndicator
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
    >
      {/* Stage pill */}
      {data.currentStage ? (
        <View style={styles.stagePill}>
          <Text style={styles.stagePillText}>{data.currentStage}</Text>
        </View>
      ) : null}

      {/* Financial cards */}
      <View style={styles.grid}>
        <StatCard label="Awarded"  value={formatAmount(data.awardValue,   cy)} accent="#2563eb" />
        <StatCard label="Billed"   value={formatAmount(data.billedTotal,  cy)} accent="#dc2626" />
        <StatCard
          label="Balance"
          value={formatAmount(Math.abs(data.balance), cy)}
          accent={data.balance >= 0 ? '#16a34a' : '#dc2626'}
          note={data.balance < 0 ? 'Over' : undefined}
        />
        <StatCard label="Cash In"  value={formatAmount(data.inflowTotal,  cy)} accent="#0891b2" />
        <StatCard label="Cash Out" value={formatAmount(data.outflowTotal, cy)} accent="#d97706" />
        <StatCard label="Milestone" value={`${data.milestoneProgress}%`}  accent="#7c3aed" />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBlock}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Milestone Progress</Text>
          <Text style={styles.progressPct}>{data.milestoneProgress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${data.milestoneProgress}%` as any }]} />
        </View>
      </View>

      {/* Action buttons */}
      <Text style={styles.sectionTitle}>Add Entry</Text>
      <View style={styles.actions}>
        <ActionBtn
          label="+ Invoice"
          color="#2563eb"
          onPress={() => navigation.navigate('InvoiceForm', { packageId, currency: cy, userName: name })}
        />
        <ActionBtn
          label="+ Cash In"
          color="#0891b2"
          onPress={() => navigation.navigate('CashInflowForm', { packageId, currency: cy, userName: name })}
        />
        <ActionBtn
          label="+ Cash Out"
          color="#d97706"
          onPress={() => navigation.navigate('CashOutflowForm', { packageId, currency: cy, userName: name })}
        />
        <ActionBtn
          label="+ Milestone"
          color="#7c3aed"
          onPress={() => navigation.navigate('MilestoneForm', { packageId, orgId, userName: name })}
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, accent, note }: { label: string; value: string; accent: string; note?: string }) {
  return (
    <View style={[styles.card, { borderTopColor: accent }]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color: accent }]}>{value}</Text>
      {note ? <Text style={[styles.cardNote, { color: accent }]}>{note}</Text> : null}
    </View>
  );
}

function ActionBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { flexGrow: 1, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stagePill: {
    margin: 12, marginBottom: 4, alignSelf: 'flex-start',
    backgroundColor: '#ede9fe', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
  },
  stagePillText: { color: '#7c3aed', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, margin: 4,
    width: '46%', borderTopWidth: 3, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardValue: { fontSize: 17, fontWeight: '800', marginTop: 5 },
  cardNote: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  progressBlock: { marginHorizontal: 12, marginTop: 4, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  progressPct: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  progressTrack: { height: 8, backgroundColor: '#ede9fe', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#7c3aed', borderRadius: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginLeft: 14, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 32 },
  actionBtn: { borderRadius: 14, padding: 18, margin: 4, width: '46%', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
