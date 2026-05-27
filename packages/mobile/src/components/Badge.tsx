import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LeadStage, LeadType } from '@syncup/shared';
import { LEAD_STAGE_LABELS, LEAD_TYPE_LABELS } from '@syncup/shared';

const stageColors: Record<LeadStage, { bg: string; text: string }> = {
  DNP: { bg: '#f5f5f5', text: '#525252' },
  callback_requested: { bg: '#eff6ff', text: '#1d4ed8' },
  followup_required: { bg: '#fffbeb', text: '#b45309' },
  meeting_booked: { bg: '#f5f3ff', text: '#7c3aed' },
  lead_onboarded: { bg: '#f0fdf4', text: '#15803d' },
};

const typeColors: Record<LeadType, { bg: string; text: string }> = {
  inbound: { bg: '#f0fdf4', text: '#15803d' },
  outbound: { bg: '#eef2ff', text: '#4338ca' },
  cold: { bg: '#f5f5f5', text: '#525252' },
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  const { bg, text } = stageColors[stage];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{LEAD_STAGE_LABELS[stage]}</Text>
    </View>
  );
}

export function TypeBadge({ type }: { type: LeadType }) {
  const { bg, text } = typeColors[type];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{LEAD_TYPE_LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
