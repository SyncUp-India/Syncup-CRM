import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const c = useColors();
  const { user, clearAuth } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => clearAuth() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Profile */}
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text style={[styles.avatarText, { color: c.primaryFg }]}>
            {user?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={[styles.name, { color: c.text }]}>{user?.name}</Text>
          <Text style={[styles.email, { color: c.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: c.accent }]}>
            <Text style={[styles.roleText, { color: c.textSecondary }]}>
              {user?.role?.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={[styles.list, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={styles.listItem}>
          <Feather name="moon" size={18} color={c.text} />
          <Text style={[styles.listItemText, { color: c.text }]}>Dark Mode</Text>
          <Switch
            value={dark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#e5e5e5', true: '#000' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.list, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <TouchableOpacity onPress={handleLogout} style={styles.listItem}>
          <Feather name="log-out" size={18} color={c.destructive} />
          <Text style={[styles.listItemText, { color: c.destructive }]}>Logout</Text>
          <Feather name="chevron-right" size={16} color={c.destructive} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, { color: c.textMuted }]}>SyncUp CRM v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 12, borderWidth: 1, padding: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  roleText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
  list: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  listItemText: { flex: 1, fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
