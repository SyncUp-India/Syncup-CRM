import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { notificationsApi } from '@/api';
import { useColors } from '@/hooks/useColors';
import type { Notification } from '@syncup/shared';
import { formatDateTime } from '@syncup/shared';

export default function NotificationsScreen() {
  const c = useColors();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res = await notificationsApi.list({ limit: 50 });
      setNotifications(res.data.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetch(); }, []);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {unread > 0 && (
        <TouchableOpacity onPress={markAllRead} style={[styles.markAllBtn, { borderBottomColor: c.cardBorder }]}>
          <Feather name="check-circle" size={14} color={c.text} />
          <Text style={[styles.markAllText, { color: c.text }]}>Mark all read ({unread})</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={c.primary} /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={c.primary} />}
          renderItem={({ item: n }) => (
            <TouchableOpacity
              onPress={() => !n.read && markRead(n.id)}
              style={[styles.item, { backgroundColor: n.read ? c.card : c.accent, borderColor: n.read ? c.cardBorder : c.primary }]}
            >
              <View style={[styles.dot, { backgroundColor: n.read ? c.cardBorder : c.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.text, fontWeight: n.read ? '400' : '600' }]}>{n.title}</Text>
                <Text style={[styles.body, { color: c.textSecondary }]}>{n.body}</Text>
                <Text style={[styles.time, { color: c.textMuted }]}>{formatDateTime(n.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell" size={36} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>No notifications</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1 },
  markAllText: { fontSize: 13, fontWeight: '500' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  title: { fontSize: 14, marginBottom: 2 },
  body: { fontSize: 13, marginBottom: 4 },
  time: { fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
