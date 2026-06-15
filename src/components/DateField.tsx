import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface DateFieldProps {
  label: string;
  value: string;                 // YYYY-MM-DD, or '' when unset
  onChange: (val: string) => void;
  required?: boolean;
  minimumDate?: Date;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = (s || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function DateField({ label, value, onChange, required, minimumDate }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<Date>(parseISO(value));

  const Field = (
    <>
      <Text style={styles.label}>
        {label}{required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <TouchableOpacity style={styles.field} onPress={() => { setTemp(parseISO(value)); setOpen(true); }} activeOpacity={0.7}>
        <Text style={value ? styles.val : styles.ph}>{value || 'Select date…'}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>
    </>
  );

  // Android renders the picker as a system dialog; no custom modal needed.
  if (Platform.OS === 'android') {
    return (
      <View style={styles.wrapper}>
        {Field}
        {open && (
          <DateTimePicker
            value={parseISO(value)}
            mode="date"
            display="calendar"
            minimumDate={minimumDate}
            onChange={(e: DateTimePickerEvent, d?: Date) => {
              setOpen(false);
              if (e.type === 'set' && d) onChange(toISO(d));
            }}
          />
        )}
      </View>
    );
  }

  // iOS: inline calendar inside a bottom-sheet with Cancel / Done.
  return (
    <View style={styles.wrapper}>
      {Field}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => { onChange(toISO(temp)); setOpen(false); }}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={temp}
              mode="date"
              display="inline"
              minimumDate={minimumDate}
              themeVariant="light"
              onChange={(_e, d?: Date) => { if (d) setTemp(d); }}
              style={styles.picker}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  req: { color: '#dc2626' },
  field: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#fff',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  val: { fontSize: 15, color: '#0f172a' },
  ph: { fontSize: 15, color: '#94a3b8' },
  icon: { fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cancel: { fontSize: 15, color: '#64748b' },
  done: { fontSize: 15, fontWeight: '700', color: '#7c3aed' },
  picker: { alignSelf: 'center' },
});
