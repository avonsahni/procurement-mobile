import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
}

export function FormField({ label, required, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="#94a3b8"
        {...inputProps}
      />
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
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0f172a', backgroundColor: '#fff',
  },
});
