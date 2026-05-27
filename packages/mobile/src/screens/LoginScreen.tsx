import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const c = useColors();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Email and password are required'); return; }
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      await setAuth(res.data.data.user, res.data.data.token);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Login failed';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={[styles.logo, { color: c.text }]}>SyncUp CRM</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>Sign in to your account</Text>

        <View style={[styles.form, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholder="you@example.com"
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholder="••••••••"
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.btn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={c.primaryFg} />
            ) : (
              <Text style={[styles.btnText, { color: c.primaryFg }]}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, { color: c.textMuted }]}>
          Default: admin@syncup.com / admin123
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  form: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500' },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  btn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnText: { fontSize: 15, fontWeight: '600' },
  hint: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});
