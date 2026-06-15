import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { FormField } from '../components/FormField';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CashOutflowForm'>;

function todayISO() { return new Date().toISOString().split('T')[0]; }

export default function CashOutflowFormScreen({ navigation, route }: Props) {
  const { packageId, currency, userName } = route.params;
  const [form, setForm] = useState({
    to_whom: '',
    on_account_of: '',
    date_paid: todayISO(),
    amount: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.to_whom.trim()) { Alert.alert('Validation', 'To Whom is required.'); return; }
    if (!form.on_account_of.trim()) { Alert.alert('Validation', 'On Account Of is required.'); return; }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount greater than 0.'); return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('cash_outflow').insert({
        package_id:    packageId,
        to_whom:       form.to_whom.trim(),
        on_account_of: form.on_account_of.trim(),
        date_paid:     form.date_paid,
        amount,
        remarks:       form.remarks.trim() || null,
        created_by:    userName,
      });
      if (error) throw error;
      Alert.alert('Saved', 'Cash outflow added successfully.', [
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
          label="To Whom"
          required
          placeholder="e.g. Contractor / Supplier Name"
          value={form.to_whom}
          onChangeText={v => set('to_whom', v)}
        />
        <FormField
          label="On Account Of"
          required
          placeholder="e.g. Work Order #12 — Steel Structure"
          value={form.on_account_of}
          onChangeText={v => set('on_account_of', v)}
        />
        <FormField
          label="Date Paid"
          placeholder="YYYY-MM-DD"
          value={form.date_paid}
          onChangeText={v => set('date_paid', v)}
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
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#d97706' }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Cash Outflow</Text>}
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
