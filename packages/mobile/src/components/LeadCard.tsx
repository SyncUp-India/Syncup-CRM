import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Lead } from '@syncup/shared';
import { formatDateTime } from '@syncup/shared';
import { StageBadge, TypeBadge } from './Badge';
import { useColors } from '@/hooks/useColors';
import { leadsApi } from '@/api';

interface Props {
  lead: Lead;
  onPress: (lead: Lead) => void;
  onStageChange?: () => void;
}

export default function LeadCard({ lead, onPress, onStageChange }: Props) {
  const c = useColors();

  const handleCall = async () => {
    const url = `tel:${lead.phone}`;
    try {
      await leadsApi.logCall(lead.id);
    } catch {}
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open dialer'));
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      onPress={() => onPress(lead)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: c.text }]}>{lead.name}</Text>
          <View style={styles.badges}>
            <TypeBadge type={lead.leadType} />
          </View>
        </View>
        <TouchableOpacity onPress={handleCall} style={[styles.callBtn, { backgroundColor: c.primary }]}>
          <Feather name="phone" size={14} color={c.primaryFg} />
        </TouchableOpacity>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: c.textSecondary }]}>
          {lead.designation ? `${lead.designation} · ` : ''}{lead.company}
        </Text>
        <Text style={[styles.metaText, { color: c.textSecondary }]}>{lead.phone}</Text>
      </View>

      <View style={styles.footer}>
        <StageBadge stage={lead.stage} />
        {lead.assignedTo && (
          <Text style={[styles.assigned, { color: c.textMuted }]}>{lead.assignedTo.name}</Text>
        )}
        <Text style={[styles.time, { color: c.textMuted }]}>{formatDateTime(lead.updatedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  info: { flex: 1, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  badges: { flexDirection: 'row', gap: 6 },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { marginBottom: 10, gap: 2 },
  metaText: { fontSize: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  assigned: { fontSize: 12 },
  time: { fontSize: 12, marginLeft: 'auto' },
});
