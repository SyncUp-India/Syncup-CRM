import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Lead, LeadFilters, LeadStage } from '@syncup/shared';
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_TYPES, LEAD_TYPE_LABELS } from '@syncup/shared';
import { leadsApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/hooks/useColors';
import LeadCard from '@/components/LeadCard';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export default function LeadsScreen({ navigation }: Props) {
  const c = useColors();
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<LeadFilters>({ page: 1, limit: 25 });
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchLeads = useCallback(async (p = 1, reset = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = { ...filters, page: p, search: searchText };
      const res = await leadsApi.list(params as Record<string, unknown>);
      const newLeads = res.data.data as Lead[];
      if (reset || p === 1) {
        setLeads(newLeads);
      } else {
        setLeads((prev) => [...prev, ...newLeads]);
      }
      setTotal(res.data.total);
      setHasMore(p < res.data.totalPages);
      setPage(p);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filters, searchText]);

  useEffect(() => { fetchLeads(1, true); }, [filters, searchText]);

  const handleRefresh = () => { setRefreshing(true); fetchLeads(1, true); };
  const handleLoadMore = () => { if (!loadingMore && hasMore) fetchLeads(page + 1); };

  const applyFilter = (key: string, value: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));
    setShowFilters(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: c.card, borderBottomColor: c.cardBorder }]}>
        <View style={[styles.searchInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
          <Feather name="search" size={16} color={c.textMuted} />
          <TextInput
            style={[styles.searchText, { color: c.text }]}
            placeholder="Search leads..."
            placeholderTextColor={c.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={[styles.filterBtn, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
          <Feather name="filter" size={16} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateLead')}
          style={[styles.addBtn, { backgroundColor: c.primary }]}
        >
          <Feather name="plus" size={16} color={c.primaryFg} />
        </TouchableOpacity>
      </View>

      {/* Active filter indicator */}
      {(filters.stage || filters.leadType) && (
        <View style={[styles.activeFilters, { backgroundColor: c.accent }]}>
          <Text style={[styles.activeFiltersText, { color: c.textSecondary }]}>
            Filters active: {[filters.stage && LEAD_STAGE_LABELS[filters.stage as LeadStage], filters.leadType && LEAD_TYPE_LABELS[filters.leadType]].filter(Boolean).join(', ')}
          </Text>
          <TouchableOpacity onPress={() => setFilters({ page: 1, limit: 25 })}>
            <Feather name="x" size={14} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.total, { color: c.textMuted }]}>{total.toLocaleString()} leads</Text>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              onPress={(lead) => navigation.navigate('LeadDetail', { id: lead.id })}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={c.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>No leads found</Text>
            </View>
          }
        />
      )}

      {/* Filter modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} onPress={() => setShowFilters(false)} />
        <View style={[styles.filterSheet, { backgroundColor: c.card }]}>
          <Text style={[styles.filterTitle, { color: c.text }]}>Filter Leads</Text>

          <Text style={[styles.filterLabel, { color: c.textSecondary }]}>Stage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => applyFilter('stage', undefined)} style={[styles.filterChip, { borderColor: c.cardBorder, backgroundColor: !filters.stage ? c.primary : c.accent }]}>
                <Text style={{ color: !filters.stage ? c.primaryFg : c.textSecondary, fontSize: 13 }}>All</Text>
              </TouchableOpacity>
              {LEAD_STAGES.map((s) => (
                <TouchableOpacity key={s} onPress={() => applyFilter('stage', s)} style={[styles.filterChip, { borderColor: c.cardBorder, backgroundColor: filters.stage === s ? c.primary : c.accent }]}>
                  <Text style={{ color: filters.stage === s ? c.primaryFg : c.textSecondary, fontSize: 13 }}>{LEAD_STAGE_LABELS[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.filterLabel, { color: c.textSecondary }]}>Lead Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => applyFilter('leadType', undefined)} style={[styles.filterChip, { borderColor: c.cardBorder, backgroundColor: !filters.leadType ? c.primary : c.accent }]}>
                <Text style={{ color: !filters.leadType ? c.primaryFg : c.textSecondary, fontSize: 13 }}>All</Text>
              </TouchableOpacity>
              {LEAD_TYPES.map((t) => (
                <TouchableOpacity key={t} onPress={() => applyFilter('leadType', t)} style={[styles.filterChip, { borderColor: c.cardBorder, backgroundColor: filters.leadType === t ? c.primary : c.accent }]}>
                  <Text style={{ color: filters.leadType === t ? c.primaryFg : c.textSecondary, fontSize: 13 }}>{LEAD_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchText: { flex: 1, fontSize: 14 },
  filterBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activeFilters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  activeFiltersText: { fontSize: 12 },
  total: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, fontSize: 12 },
  list: { padding: 16, paddingTop: 8 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  filterSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  filterTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  filterLabel: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
});
