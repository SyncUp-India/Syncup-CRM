import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
  Alert, TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Lead, LeadStage, Activity } from '@syncup/shared';
import { LEAD_STAGE_LABELS, LEAD_STAGES, FOLLOWUP_NUMBERS, FOLLOWUP_LABELS, formatDateTime } from '@syncup/shared';
import { leadsApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/hooks/useColors';
import { StageBadge, TypeBadge } from '@/components/Badge';

interface Props {
  route: { params: { id: string } };
  navigation: { goBack: () => void };
}

export default function LeadDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const c = useColors();
  const { user } = useAuthStore();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');
  const [followupNumber, setFollowupNumber] = useState('followup_1');
  const [savingFollowup, setSavingFollowup] = useState(false);

  const fetchLead = async () => {
    try {
      const res = await leadsApi.get(id);
      setLead(res.data.data);
    } catch {
      Alert.alert('Error', 'Lead not found');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLead(); }, [id]);

  const canEdit = user?.role !== 'associate' || lead?.assignedToId === user?.id;

  const handleCall = async () => {
    if (!lead) return;
    try { await leadsApi.logCall(lead.id); } catch {}
    Linking.openURL(`tel:${lead.phone}`).catch(() => Alert.alert('Error', 'Cannot open dialer'));
  };

  const handleStageChange = async (stage: LeadStage) => {
    if (!lead) return;
    try {
      await leadsApi.changeStage(lead.id, stage);
      setLead((l) => l ? { ...l, stage } : l);
      setShowStageModal(false);
      await fetchLead();
    } catch {
      Alert.alert('Error', 'Failed to update stage');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !lead) return;
    setAddingNote(true);
    try {
      await leadsApi.addNote(lead.id, noteText.trim());
      setNoteText('');
      await fetchLead();
    } catch {
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleScheduleFollowup = async () => {
    if (!followupDate || !lead) { Alert.alert('Error', 'Set a date'); return; }
    const scheduledAt = new Date(`${followupDate}T${followupTime || '09:00'}`).toISOString();
    setSavingFollowup(true);
    try {
      await leadsApi.scheduleFollowup(lead.id, { followupNumber, scheduledAt });
      setShowFollowupModal(false);
      setFollowupDate('');
      setFollowupTime('');
      await fetchLead();
    } catch (err: unknown) {
      Alert.alert('Error', (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to schedule followup');
    } finally {
      setSavingFollowup(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!lead) return null;

  const pendingFollowups = lead.followups?.filter((f) => !f.completedAt) || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.cardBorder }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.text }]}>{lead.name}</Text>
            <View style={styles.badges}>
              <StageBadge stage={lead.stage} />
              <TypeBadge type={lead.leadType} />
            </View>
          </View>
          <TouchableOpacity onPress={handleCall} style={[styles.callBtn, { backgroundColor: c.primary }]}>
            <Feather name="phone" size={18} color={c.primaryFg} />
            <Text style={[styles.callBtnText, { color: c.primaryFg }]}>Call</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fields}>
          {lead.designation && <FieldRow icon="briefcase" label="Designation" value={lead.designation} c={c} />}
          <FieldRow icon="building" label="Company" value={lead.company} c={c} />
          <FieldRow icon="phone" label="Phone" value={lead.phone} c={c} />
          {lead.email && <FieldRow icon="mail" label="Email" value={lead.email} c={c} />}
          {lead.assignedTo && <FieldRow icon="user" label="Assigned To" value={lead.assignedTo.name} c={c} />}
        </View>

        {canEdit && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => setShowStageModal(true)}
              style={[styles.actionBtn, { borderColor: c.cardBorder }]}
            >
              <Feather name="refresh-cw" size={14} color={c.text} />
              <Text style={[styles.actionBtnText, { color: c.text }]}>Change Stage</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowFollowupModal(true)}
              style={[styles.actionBtn, { borderColor: c.cardBorder }]}
            >
              <Feather name="calendar" size={14} color={c.text} />
              <Text style={[styles.actionBtnText, { color: c.text }]}>Schedule Followup</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Followups */}
      {pendingFollowups.length > 0 && (
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Pending Followups</Text>
          {pendingFollowups.map((f) => (
            <View key={f.id} style={[styles.followupItem, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <Text style={styles.followupNum}>{FOLLOWUP_LABELS[f.followupNumber]}</Text>
              <Text style={styles.followupDate}>{formatDateTime(f.scheduledAt)}</Text>
              <TouchableOpacity
                onPress={async () => { await leadsApi.completeFollowup(lead.id, f.id); fetchLead(); }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneBtnText}>Mark Done</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Note */}
      {canEdit && (
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Add Note</Text>
          <TextInput
            style={[styles.noteInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            placeholder="Write a note..."
            placeholderTextColor={c.textMuted}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            onPress={handleAddNote}
            disabled={addingNote || !noteText.trim()}
            style={[styles.noteBtn, { backgroundColor: c.primary, opacity: addingNote || !noteText.trim() ? 0.5 : 1 }]}
          >
            <Text style={[styles.noteBtnText, { color: c.primaryFg }]}>{addingNote ? 'Adding...' : 'Add Note'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Activity Timeline */}
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>Activity Timeline</Text>
        {(lead.activities || []).slice(0, 20).map((a: Activity) => (
          <View key={a.id} style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: c.cardBorder }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.activityDetails, { color: c.text }]}>{a.details}</Text>
              <Text style={[styles.activityTime, { color: c.textMuted }]}>
                {a.user?.name ? `${a.user.name} · ` : ''}{formatDateTime(a.createdAt)}
              </Text>
            </View>
          </View>
        ))}
        {(lead.activities || []).length === 0 && (
          <Text style={[styles.emptyText, { color: c.textMuted }]}>No activity yet.</Text>
        )}
      </View>

      <View style={{ height: 32 }} />

      {/* Stage Change Modal */}
      <Modal visible={showStageModal} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} onPress={() => setShowStageModal(false)} />
        <View style={[styles.modalSheet, { backgroundColor: c.card }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>Change Stage</Text>
          {LEAD_STAGES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => handleStageChange(s)}
              style={[styles.stageOption, { borderColor: c.cardBorder, backgroundColor: lead.stage === s ? c.accent : 'transparent' }]}
            >
              <Text style={[styles.stageOptionText, { color: c.text, fontWeight: lead.stage === s ? '600' : '400' }]}>
                {LEAD_STAGE_LABELS[s]}
              </Text>
              {lead.stage === s && <Feather name="check" size={16} color={c.text} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Followup Modal */}
      <Modal visible={showFollowupModal} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} onPress={() => setShowFollowupModal(false)} />
        <View style={[styles.modalSheet, { backgroundColor: c.card }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>Schedule Followup</Text>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Followup Number</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {FOLLOWUP_NUMBERS.map((n) => (
              <TouchableOpacity key={n} onPress={() => setFollowupNumber(n)} style={[styles.chipBtn, { backgroundColor: followupNumber === n ? c.primary : c.accent, borderColor: c.cardBorder }]}>
                <Text style={{ color: followupNumber === n ? c.primaryFg : c.textSecondary, fontSize: 13 }}>{FOLLOWUP_LABELS[n]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.followupInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            placeholder="2026-06-15"
            placeholderTextColor={c.textMuted}
            value={followupDate}
            onChangeText={setFollowupDate}
          />
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Time (HH:MM)</Text>
          <TextInput
            style={[styles.followupInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            placeholder="10:00"
            placeholderTextColor={c.textMuted}
            value={followupTime}
            onChangeText={setFollowupTime}
          />
          <TouchableOpacity onPress={handleScheduleFollowup} disabled={savingFollowup} style={[styles.noteBtn, { backgroundColor: c.primary, marginTop: 16 }]}>
            <Text style={[styles.noteBtnText, { color: c.primaryFg }]}>{savingFollowup ? 'Scheduling...' : 'Schedule'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FieldRow({ icon, label, value, c }: { icon: string; label: string; value: string; c: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.fieldRow}>
      <Feather name={icon as never} size={13} color={c.textMuted} style={{ marginTop: 1 }} />
      <View>
        <Text style={[styles.fieldLabel2, { color: c.textMuted }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: c.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 8 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  callBtnText: { fontWeight: '600', fontSize: 14 },
  fields: { gap: 10 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fieldLabel2: { fontSize: 11, marginBottom: 1 },
  fieldValue: { fontSize: 14, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '500' },
  section: { margin: 16, marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  followupItem: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 8 },
  followupNum: { fontSize: 13, fontWeight: '600', color: '#b45309', marginBottom: 2 },
  followupDate: { fontSize: 12, color: '#92400e', marginBottom: 8 },
  doneBtn: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#22c55e' },
  doneBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  noteInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80, marginBottom: 10, textAlignVertical: 'top' },
  noteBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  noteBtnText: { fontWeight: '600', fontSize: 14 },
  activityItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  activityDetails: { fontSize: 13, lineHeight: 20 },
  activityTime: { fontSize: 11, marginTop: 2 },
  emptyText: { fontSize: 13 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  stageOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  stageOptionText: { fontSize: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  followupInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 14 },
  chipBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
});
