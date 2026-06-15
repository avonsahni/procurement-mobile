import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { FormField } from '../components/FormField';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CashInflowForm'>;

function todayISO() { return new Date().toISOString().split('T')[0]; }

export default function CashInflowFormScreen({ navigation, route }: Props) {
  const { packageId, currency, userName } = route.params;
  const [form, setForm] = useState({
    from_party: '',
    on_account: '',
    date_received: todayISO(),
    amount: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.from_party.trim()) { Alert.alert('Validation', 'From Party is required.'); return; }
    if (!form.on_account.trim()) { Alert.alert('Validation', 'On Account Of is required.'); return; }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount greater than 0.'); return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('cash_inflow').insert({
        package_id:    packageId,
        from_party:    form.from_party.trim(),
        on_account:    form.on_account.trim(),
        date_received: form.date_received,
        amount,
        remarks:       form.remarks.trim() || null,
        created_by:    userName,
      });
      if (error) throw error;
      Alert.alert('Saved', 'Cash inflow added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <FormField
          label="From Party"
          required
          placeholder="e.g. Client Name / Company"
          value={form.from_party}
          onChangeText={v => set('from_party', v)}
        />
        <FormField
          label="On Account Of"
          required
          placeholder="e.g. Running Bill #3 — Civil Works"
          value={form.on_account}
          onChangeText={v => set('on_account', v)}
        />
        <FormField
          label="Date Received"
          placeholder="YYYY-MM-DD"
          value={form.date_received}
          onChangeText={v => set('date_received', v)}
        />
        <FormField
          label={`Amount (${currency})`}
          required
          placeholder="0.00"
          value={form.amount}
          onChangeText={v => set('amount', v)}
          keyboardType="decimal-pad"
        />
        <FormField
          label="Remarks"
          placeholder="Optional…"
          value={form.remarks}
          onChangeText={v => set('remarks', v)}
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#0891b2' }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Cash Inflow</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  form: { padding: 16 },
  multiline: { height: 90, textAlignVertical: 'top' },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
