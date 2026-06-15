import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/types';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'MilestoneDetail'>;

interface MilestoneTask {
  id: string;
  name: string;
  description: string | null;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
}

function clampPct(val: string): number {
  return Math.min(100, Math.max(0, parseInt(val, 10) || 0));
}

const EMPTY_FORM = { description: '', start_date: '', end_date: '', progress: '0' };

export default function MilestoneDetailScreen({ route }: Props) {
  const { packageId, orgId, milestoneName, userName } = route.params;
  const { user } = useAuth();
  const writable = canWrite(user?.role);

  const [tasks, setTasks] = useState<MilestoneTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof EMPTY_FORM, val: string) => setForm(f => ({ ...f, [key]: val }));

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('milestone_tasks')
      .select('id, name, description, progress, start_date, end_date, sort_order')
      .eq('package_id', packageId)
      .eq('milestone_name', milestoneName)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setTasks((data || []) as MilestoneTask[]);
  }, [packageId, milestoneName]);

  useEffect(() => {
    fetchTasks().finally(() => setLoading(false));
  }, [fetchTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  // Persist an edited completion % for an existing task.
  const saveProgress = async (task: MilestoneTask, raw: string) => {
    const progress = clampPct(raw);
    if (progress === task.progress) return;
    setTasks(ts => ts.map(t => (t.id === task.id ? { ...t, progress } : t)));
    setSavingId(task.id);
    const { error } = await supabase
      .from('milestone_tasks')
      .update({ progress })
      .eq('id', task.id);
    setSavingId(null);
    if (error) {
      Alert.alert('Error', error.message || 'Could not update progress.');
      fetchTasks(); // revert to server state on failure
    }
  };

  const handleAdd = async () => {
    if (!form.description.trim()) { Alert.alert('Validation', 'Task description is required.'); return; }
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('milestone_tasks').insert({
        package_id:     packageId,
        org_id:         orgId,
        milestone_name: milestoneName,
        name:           form.description.trim(),
        description:    null,
        progress:       clampPct(form.progress),
        start_date:     form.start_date || null,
        end_date:       form.end_date   || null,
        sort_order:     tasks.length,
        created_by:     userName,
      });
      if (error) throw error;
      setForm(EMPTY_FORM);
      setAddOpen(false);
      await fetchTasks();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add task.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      alwaysBounceVertical
      showsVerticalScrollIndicator
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
    >
      <Text style={styles.sectionHeading}>Tasks</Text>

      {tasks.length === 0 ? (
        <Text style={styles.emptyText}>No tasks under this milestone yet.</Text>
      ) : (
        tasks.map(task => (
          <View key={task.id} style={styles.taskCard}>
            <Text style={styles.taskName}>{task.name}</Text>
            {(task.start_date || task.end_date) ? (
              <Text style={styles.taskDates}>{task.start_date || '—'} → {task.end_date || '—'}</Text>
            ) : null}

            <View style={styles.pctRow}>
              <Text style={styles.pctLabel}>Completion</Text>
              <View style={styles.pctInputWrap}>
                <TextInput
                  style={[styles.pctInput, !writable && styles.pctInputDisabled]}
                  defaultValue={String(task.progress)}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  editable={writable}
                  onEndEditing={e => saveProgress(task, e.nativeEvent.text)}
                />
                <Text style={styles.pctSign}>%</Text>
                {savingId === task.id ? (
                  <ActivityIndicator size="small" color="#7c3aed" style={{ marginLeft: 8 }} />
                ) : null}
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${task.progress}%` }]} />
            </View>
          </View>
        ))
      )}

      {/* Add task — only for users who can write. */}
      {!writable ? (
        <Text style={styles.readOnlyNote}>Read-only access</Text>
      ) : !addOpen ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add Task to {milestoneName}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addCard}>
          <Text style={styles.sectionHeading}>New Task</Text>
          <FormField
            label="Task Description"
            required
            placeholder="e.g. Pour slab concrete"
            value={form.description}
            onChangeText={v => set('description', v)}
            multiline
            numberOfLines={2}
            style={styles.multiline}
          />
          <DateField
            label="Start Date"
            value={form.start_date}
            onChange={v => set('start_date', v)}
          />
          <DateField
            label="End Date"
            value={form.end_date}
            onChange={v => set('end_date', v)}
            minimumDate={form.start_date ? new Date(form.start_date) : undefined}
          />
          <FormField
            label="Completion % (0–100)"
            placeholder="0"
            value={form.progress}
            onChangeText={v => set('progress', v)}
            keyboardType="number-pad"
            maxLength={3}
          />

          <View style={styles.addActions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => { setAddOpen(false); setForm(EMPTY_FORM); }}
              disabled={saving}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Save Task</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, paddingBottom: 48, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  taskCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  taskName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  taskDates: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  pctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  pctLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  pctInputWrap: { flexDirection: 'row', alignItems: 'center' },
  pctInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc',
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, fontWeight: '700',
    color: '#0f172a', minWidth: 56, textAlign: 'right',
  },
  pctInputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  pctSign: { fontSize: 15, fontWeight: '700', color: '#64748b', marginLeft: 4 },
  readOnlyNote: { fontSize: 13, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#ede9fe', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#7c3aed' },
  addBtn: {
    borderWidth: 1.5, borderColor: '#7c3aed', borderStyle: 'dashed', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  addBtnText: { color: '#7c3aed', fontSize: 15, fontWeight: '700' },
  addCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  multiline: { height: 64, textAlignVertical: 'top' },
  addActions: { flexDirection: 'row', marginTop: 4 },
  btn: { flex: 1, borderRadius: 12, padding: 15, alignItems: 'center' },
  btnGhost: { backgroundColor: '#f1f5f9', marginRight: 8 },
  btnGhostText: { color: '#475569', fontSize: 15, fontWeight: '700' },
  btnPrimary: { backgroundColor: '#7c3aed' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
