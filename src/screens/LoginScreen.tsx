import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    if (loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>PT</Text>
          <Text style={styles.appName}>ProcureTrack</Text>
          <Text style={styles.tagline}>Field Entry</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            textContentType="emailAddress"
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#1e3a5f' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff',
    textAlign: 'center', lineHeight: 64, fontSize: 24, fontWeight: '800', color: '#1e3a5f',
    overflow: 'hidden',
  },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 12 },
  tagline: { fontSize: 13, color: '#93c5fd', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
