import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { dashboardApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/hooks/useColors';
import type { DashboardStats, DailyActivity } from '@syncup/shared';
import { LEAD_STAGE_LABELS } from '@syncup/shared';

const { width } = Dimensions.get('window');
const chartWidth = width - 48;

export default function DashboardScreen() {
  const c = useColors();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardApi.stats({ period }),
      dashboardApi.dailyActivity({ period }),
    ]).then(([s, a]) => {
      setStats(s.data.data);
      setActivity(a.data.data.slice(-7));
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const chartConfig = {
    backgroundGradientFrom: c.card,
    backgroundGradientTo: c.card,
    color: () => c.primary,
    strokeWidth: 2,
    labelColor: () => c.textSecondary,
    propsForBackgroundLines: { stroke: c.cardBorder },
  };

  const periods = ['today', 'week', 'month'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>Welcome back, {user?.name}</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.periodBtn, { backgroundColor: period === p ? c.primary : c.card, borderColor: c.cardBorder }]}
          >
            <Text style={[styles.periodText, { color: period === p ? c.primaryFg : c.textSecondary }]}>
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : stats ? (
        <>
          {/* Stats cards */}
          <View style={styles.statsGrid}>
            <StatCard label="Total Leads" value={stats.totalLeads} c={c} />
            <StatCard label="Calls Made" value={stats.callsMade} c={c} />
            <StatCard label="Onboarded" value={stats.leadsOnboarded} c={c} />
            <StatCard label="Conversion" value={`${stats.conversionRate}%`} c={c} />
          </View>

          {/* Stage bar chart */}
          <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.chartTitle, { color: c.text }]}>Leads by Stage</Text>
            <BarChart
              data={{
                labels: Object.keys(stats.byStage).map((s) => LEAD_STAGE_LABELS[s as keyof typeof LEAD_STAGE_LABELS].split(' ')[0]),
                datasets: [{ data: Object.values(stats.byStage) }],
              }}
              width={chartWidth}
              height={200}
              chartConfig={chartConfig}
              style={{ borderRadius: 8 }}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>

          {/* Line chart */}
          {activity.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.chartTitle, { color: c.text }]}>Daily Calls</Text>
              <LineChart
                data={{
                  labels: activity.map((a) => a.date.slice(5)),
                  datasets: [{ data: activity.map((a) => a.calls || 0) }],
                }}
                width={chartWidth}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: 8 }}
              />
            </View>
          )}

          {/* Type pie */}
          <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.chartTitle, { color: c.text }]}>Lead Types</Text>
            <PieChart
              data={[
                { name: 'Inbound', population: stats.byType.inbound, color: '#000', legendFontColor: c.textSecondary, legendFontSize: 12 },
                { name: 'Outbound', population: stats.byType.outbound, color: '#737373', legendFontColor: c.textSecondary, legendFontSize: 12 },
                { name: 'Cold', population: stats.byType.cold, color: '#d4d4d4', legendFontColor: c.textSecondary, legendFontSize: 12 },
              ].filter((d) => d.population > 0)}
              width={chartWidth}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="0"
            />
          </View>
        </>
      ) : null}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, c }: { label: string; value: number | string; c: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Text style={[styles.statValue, { color: c.text }]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  periodText: { fontSize: 13, fontWeight: '500' },
  loader: { padding: 40, alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 24, marginBottom: 4 },
  statCard: { flex: 1, minWidth: '44%', borderRadius: 12, borderWidth: 1, padding: 16 },
  statValue: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  chartCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginHorizontal: 24, marginTop: 12 },
  chartTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
});
