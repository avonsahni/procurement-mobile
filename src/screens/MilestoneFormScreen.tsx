import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { FormField } from '../components/FormField';
import { MILESTONE_NAMES, MilestoneName } from '../lib/types';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'MilestoneForm'>;

function todayISO() { return new Date().toISOString().split('T')[0]; }

export default function MilestoneFormScreen({ navigation, route }: Props) {
  const { packageId, orgId, userName } = route.params;
  const [form, setForm] = useState({
    milestone_name: '' as MilestoneName | '',
    name: '',
    description: '',
    progress: '0',
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.milestone_name) { Alert.alert('Validation', 'Please select a milestone.'); return; }
    if (!form.name.trim())    { Alert.alert('Validation', 'Task Name is required.'); return; }
    const progress = Math.min(100, Math.max(0, parseInt(form.progress) || 0));
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('milestone_tasks').insert({
        package_id:     packageId,
        org_id:         orgId,
        milestone_name: form.milestone_name,
        name:           form.name.trim(),
        description:    form.description.trim() || null,
        progress,
        start_date:     form.start_date || null,
        end_date:       form.end_date   || null,
        sort_order:     0,
        created_by:     userName,
      });
      if (error) throw error;
      Alert.alert('Saved', 'Milestone task added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {/* Milestone picker */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Milestone <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity style={styles.picker} onPress={() => setPickerOpen(true)}>
              <Text style={form.milestone_name ? styles.pickerVal : styles.pickerPh}>
                {form.milestone_name || 'Select milestone…'}
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </TouchableOpacity>
          </View>

          <FormField
            label="Task Name"
            required
            placeholder="e.g. Pour slab concrete"
            value={form.name}
            onChangeText={v => set('name', v)}
          />
          <FormField
            label="Description"
            placeholder="Optional description…"
            value={form.description}
            onChangeText={v => set('description', v)}
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
          <FormField
            label="Progress (0–100)"
            placeholder="0"
            value={form.progress}
            onChangeText={v => set('progress', v)}
            keyboardType="number-pad"
          />
          <FormField
            label="Start Date"
            placeholder="YYYY-MM-DD"
            value={form.start_date}
            onChangeText={v => set('start_date', v)}
          />
          <FormField
            label="End Date"
            placeholder="YYYY-MM-DD"
            value={form.end_date}
            onChangeText={v => set('end_date', v)}
          />

          <TouchableOpacity style={[styles.btn, { backgroundColor: '#7c3aed' }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Task</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom sheet milestone picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Milestone</Text>
            <FlatList
              data={MILESTONE_NAMES}
              keyExtractor={n => n}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sheetItem, form.milestone_name === item && styles.sheetItemActive]}
                  onPress={() => { set('milestone_name', item); setPickerOpen(false); }}
                >
                  <Text style={[styles.sheetItemText, form.milestone_name === item && styles.sheetItemTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  form: { padding: 16 },
  fieldBlock: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  req: { color: '#dc2626' },
  picker: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, backgroundColor: '#fff', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  pickerVal: { fontSize: 15, color: '#0f172a', flex: 1 },
  pickerPh: { fontSize: 15, color: '#94a3b8', flex: 1 },
  chevron: { fontSize: 16, color: '#64748b' },
  multiline: { height: 90, textAlignVertical: 'top' },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: '65%',
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  sheetItem: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  sheetItemActive: { backgroundColor: '#ede9fe' },
  sheetItemText: { fontSize: 15, color: '#334155' },
  sheetItemTextActive: { color: '#7c3aed', fontWeight: '600' },
});
