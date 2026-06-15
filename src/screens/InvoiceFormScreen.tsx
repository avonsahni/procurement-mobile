import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { FormField } from '../components/FormField';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceForm'>;

function todayISO() { return new Date().toISOString().split('T')[0]; }

export default function InvoiceFormScreen({ navigation, route }: Props) {
  const { packageId, currency, userName } = route.params;
  const [form, setForm] = useState({
    invoice_number: '',
    amount: '',
    invoice_date: todayISO(),
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('invoices').insert({
        package_id:     packageId,
        amount,
        invoice_number: form.invoice_number.trim(),
        invoice_date:   form.invoice_date || new Date().toISOString(),
        notes:          form.notes.trim(),
        username:       userName,
      });
      if (error) throw error;
      Alert.alert('Saved', 'Invoice added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <FormField
          label="Invoice Number"
          placeholder="INV-2024-001"
          value={form.invoice_number}
          onChangeText={v => set('invoice_number', v)}
          autoCapitalize="characters"
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
          label="Invoice Date"
          placeholder="YYYY-MM-DD"
          value={form.invoice_date}
          onChangeText={v => set('invoice_date', v)}
        />
        <FormField
          label="Notes"
          placeholder="Optional notes…"
          value={form.notes}
          onChangeText={v => set('notes', v)}
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#2563eb' }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Invoice</Text>}
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
