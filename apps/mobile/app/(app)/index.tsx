import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useDashboard } from '@/hooks/use-dashboard';
import { StatCard } from '@/components/StatCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Colors } from '@/constants/colors';
import { api } from '@/lib/api';

interface AnalyticsData {
  memberGrowth: Array<{ label: string; count: number }>;
  memberTimeline: Array<{ label: string; total: number }>;
  revenueByMonth: Array<{ label: string; amount: number }>;
  churnByMonth: Array<{ label: string; new: number; expired: number }>;
  tierDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  teamStats: Array<{
    id: string;
    name: string;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    total: number;
    completionRate: number;
  }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('hr-HR');
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: Colors.successLight, text: Colors.success, label: 'Aktivan' },
  PENDING: { bg: Colors.warningLight, text: Colors.warning, label: 'Na čekanju' },
  EXPIRED: { bg: Colors.dangerLight, text: Colors.danger, label: 'Istekao' },
};

export default function DashboardScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useDashboard();

  if (loading && !data) {
    return <LoadingScreen message="Učitavanje dashboarda..." />;
  }

  if (error && !data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data) return null;

  const expiringCount = (data.upcomingExpirations || []).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />
      }
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Ukupno članova" value={data.members.total} color="primary" />
        <StatCard label="Aktivni" value={data.members.active} color="success" />
        <StatCard label="Na čekanju" value={data.members.pending} color="warning" />
        <StatCard label="Ističu uskoro" value={expiringCount} color="danger" />
      </View>

      {/* Revenue */}
      <View style={styles.revenueRow}>
        <View style={[styles.revenueCard, { marginRight: 6 }]}>
          <Text style={styles.revenueLabel}>Prihod ovog mjeseca</Text>
          <Text style={styles.revenueValue}>{formatCurrency(data.revenue.thisMonth)}</Text>
        </View>
        <View style={[styles.revenueCard, { marginLeft: 6 }]}>
          <Text style={styles.revenueLabel}>Prihod ove godine</Text>
          <Text style={styles.revenueValue}>{formatCurrency(data.revenue.thisYear)}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brzi pregled</Text>
        <View style={styles.quickStatsCard}>
          <View style={styles.quickStatRow}>
            <Text style={styles.quickStatLabel}>Zadaci na čekanju</Text>
            <View style={[styles.quickStatBadge, { backgroundColor: Colors.warningLight }]}>
              <Text style={[styles.quickStatValue, { color: Colors.warning }]}>{data.pendingTasks}</Text>
            </View>
          </View>
          <View style={styles.quickStatRow}>
            <Text style={styles.quickStatLabel}>Nepročitane obavijesti</Text>
            <View style={[styles.quickStatBadge, { backgroundColor: Colors.infoLight }]}>
              <Text style={[styles.quickStatValue, { color: Colors.info }]}>{data.unreadNotifications}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Upcoming Expirations with Send Offer */}
      <ExpiringMembersSection
        members={data.upcomingExpirations || []}
        onPressMember={(memberId) => router.push({ pathname: '/member-detail', params: { id: memberId } })}
      />

      {/* Recent Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nedavni članovi</Text>
        {(data.recentMembers || []).map((m) => {
          const statusColor = STATUS_COLORS[m.status] || { bg: Colors.gray100, text: Colors.gray500, label: m.status };
          const expiryDate = m.expiresAt ? formatDate(m.expiresAt) : null;
          return (
            <TouchableOpacity
              key={m.id}
              style={styles.memberCard}
              onPress={() => router.push({ pathname: '/member-detail', params: { id: m.id } })}
              activeOpacity={0.6}
            >
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {m.user.firstName} {m.user.lastName}
                </Text>
                <Text style={styles.memberCompany}>{m.company.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                  <Text style={[styles.statusText, { color: statusColor.text }]}>{statusColor.label}</Text>
                </View>
                {expiryDate && (
                  <Text style={styles.memberDate}>ističe: {expiryDate}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {(data.recentMembers || []).length === 0 && (
          <Text style={styles.emptyText}>Nema nedavnih članova</Text>
        )}
      </View>

      {/* Analytics */}
      <AnalyticsSection />
    </ScrollView>
  );
}

function ExpiringMembersSection({
  members,
  onPressMember,
}: {
  members: Array<{ id: string; expiresAt: string; company: { name: string }; user: { firstName: string; lastName: string } }>;
  onPressMember: (id: string) => void;
}) {
  const [offerSteps, setOfferSteps] = useState<Record<string, number>>({});
  const [offerSending, setOfferSending] = useState<Record<string, 'sending' | 'sent' | 'error'>>({});

  useEffect(() => {
    for (const m of members) {
      api.get<{ step: number }>(`/api/os/members/${m.id}/offer-step`).then((res) => {
        setOfferSteps((prev) => ({ ...prev, [m.id]: res.success && res.data ? res.data.step : 0 }));
      });
    }
  }, [members]);

  const handleSendOffer = async (memberId: string) => {
    setOfferSending((prev) => ({ ...prev, [memberId]: 'sending' }));
    const res = await api.post<{ offer: { step: number } }>(`/api/os/members/${memberId}/send-offer`, {});
    if (res.success && res.data) {
      setOfferSteps((prev) => ({ ...prev, [memberId]: res.data!.offer.step }));
      setOfferSending((prev) => ({ ...prev, [memberId]: 'sent' }));
      setTimeout(() => setOfferSending((prev) => { const n = { ...prev }; delete n[memberId]; return n; }), 3000);
    } else {
      setOfferSending((prev) => ({ ...prev, [memberId]: 'error' }));
      Alert.alert('Greška', res.error?.message || 'Slanje ponude nije uspjelo.');
    }
  };

  if (members.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ističu uskoro ({members.length})</Text>
      {members.map((m) => {
        const step = offerSteps[m.id] ?? -1;
        const sending = offerSending[m.id];
        return (
          <View key={m.id} style={styles.expiringCard}>
            <TouchableOpacity
              style={styles.expiringInfo}
              onPress={() => onPressMember(m.id)}
              activeOpacity={0.6}
            >
              <Text style={styles.memberName}>{m.user.firstName} {m.user.lastName}</Text>
              <Text style={styles.memberCompany}>{m.company.name}</Text>
              <Text style={styles.expiringDate}>ističe: {formatDate(m.expiresAt)}</Text>
            </TouchableOpacity>
            <View style={styles.expiringActions}>
              {sending === 'sent' ? (
                <View style={styles.sentBadge}>
                  <Text style={styles.sentBadgeText}>Poslano</Text>
                </View>
              ) : step === -1 ? (
                <Text style={{ fontSize: 11, color: Colors.gray300 }}>...</Text>
              ) : (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {step >= 1 && (
                    <View style={[styles.stepBadge, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.stepBadgeText, { color: '#1D4ED8' }]}>1. poslana</Text>
                    </View>
                  )}
                  {step >= 2 && (
                    <View style={[styles.stepBadge, { backgroundColor: '#FFF7ED' }]}>
                      <Text style={[styles.stepBadgeText, { color: '#C2410C' }]}>2. poslana</Text>
                    </View>
                  )}
                  {step < 2 && (
                    <TouchableOpacity
                      style={[styles.sendOfferBtn, { backgroundColor: step === 0 ? '#16A34A' : '#F97316' }]}
                      onPress={() => handleSendOffer(m.id)}
                      disabled={sending === 'sending'}
                      activeOpacity={0.7}
                    >
                      {sending === 'sending' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.sendOfferBtnText}>
                          {`${step + 1}. obavijest`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MiniBarChart({ data, color }: { data: Array<{ label: string; value: number }>; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  // Show last 6 months for mobile
  const recent = data.slice(-6);
  return (
    <View style={aStyles.chartContainer}>
      <View style={aStyles.barsRow}>
        {recent.map((d, i) => (
          <View key={i} style={aStyles.barCol}>
            <View style={aStyles.barTrack}>
              <View
                style={[
                  aStyles.bar,
                  {
                    height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={aStyles.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DistributionBar({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  return (
    <View>
      <View style={aStyles.distBar}>
        {segments.filter((s) => s.value > 0).map((s, i) => (
          <View
            key={i}
            style={{
              flex: s.value,
              height: 10,
              backgroundColor: s.color,
              borderTopLeftRadius: i === 0 ? 5 : 0,
              borderBottomLeftRadius: i === 0 ? 5 : 0,
              borderTopRightRadius: i === segments.length - 1 ? 5 : 0,
              borderBottomRightRadius: i === segments.length - 1 ? 5 : 0,
            }}
          />
        ))}
      </View>
      <View style={aStyles.distLegend}>
        {segments.filter((s) => s.value > 0).map((s, i) => (
          <View key={i} style={aStyles.distLegendItem}>
            <View style={[aStyles.distDot, { backgroundColor: s.color }]} />
            <Text style={aStyles.distLegendText}>
              {s.label} ({s.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AnalyticsData>('/api/os/dashboard/analytics').then((res) => {
      if (res.success && res.data) setAnalytics(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={aStyles.loadingWrap}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!analytics) return null;

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const totalRevenue = analytics.revenueByMonth.reduce((s, m) => s + m.amount, 0);
  const totalNew = analytics.memberGrowth.reduce((s, m) => s + m.count, 0);
  const totalExpired = analytics.churnByMonth.reduce((s, m) => s + m.expired, 0);
  const latestTotal = analytics.memberTimeline[analytics.memberTimeline.length - 1]?.total ?? 0;
  const sixMonthsAgo = analytics.memberTimeline[5]?.total ?? 0;
  const growthPct = sixMonthsAgo > 0 ? Math.round(((latestTotal - sixMonthsAgo) / sixMonthsAgo) * 100) : 0;

  const tierLabels: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };
  const tierColors: Record<string, string> = { FREE: '#94A3B8', STANDARD: '#3B82F6', PREMIUM: '#8B5CF6' };
  const typeLabels: Record<string, string> = { WEB_TRADER: 'Web trgovac', SERVICE_PROVIDER: 'Nuditelj usluga', PHYSICAL: 'Fizički' };
  const typeColors: Record<string, string> = { WEB_TRADER: '#1B365D', SERVICE_PROVIDER: '#E8A838', PHYSICAL: '#10B981' };

  return (
    <View style={aStyles.container}>
      {/* Divider */}
      <View style={aStyles.divider}>
        <View style={aStyles.dividerLine} />
        <Text style={aStyles.dividerText}>Analitika</Text>
        <View style={aStyles.dividerLine} />
      </View>

      {/* KPI Cards */}
      <View style={aStyles.kpiRow}>
        <View style={[aStyles.kpiCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={aStyles.kpiLabel}>Rast (6mj)</Text>
          <Text style={[aStyles.kpiValue, { color: growthPct >= 0 ? '#16A34A' : '#DC2626' }]}>
            {growthPct >= 0 ? '+' : ''}{growthPct}%
          </Text>
        </View>
        <View style={[aStyles.kpiCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={aStyles.kpiLabel}>Prihod 12mj</Text>
          <Text style={[aStyles.kpiValue, { color: '#16A34A' }]}>{fmtCurrency(totalRevenue)}</Text>
        </View>
      </View>
      <View style={aStyles.kpiRow}>
        <View style={[aStyles.kpiCard, { backgroundColor: '#EEF2FF' }]}>
          <Text style={aStyles.kpiLabel}>Novih 12mj</Text>
          <Text style={[aStyles.kpiValue, { color: '#4F46E5' }]}>{totalNew}</Text>
        </View>
        <View style={[aStyles.kpiCard, { backgroundColor: '#FEF2F2' }]}>
          <Text style={aStyles.kpiLabel}>Isteklo 12mj</Text>
          <Text style={[aStyles.kpiValue, { color: '#DC2626' }]}>{totalExpired}</Text>
        </View>
      </View>

      {/* Member Timeline Chart */}
      <View style={aStyles.chartCard}>
        <Text style={aStyles.chartTitle}>Ukupno članova</Text>
        <MiniBarChart
          data={analytics.memberTimeline.map((m) => ({ label: m.label, value: m.total }))}
          color="#3B82F6"
        />
      </View>

      {/* Revenue Chart */}
      <View style={aStyles.chartCard}>
        <Text style={aStyles.chartTitle}>Prihod po mjesecu</Text>
        <MiniBarChart
          data={analytics.revenueByMonth.map((m) => ({ label: m.label, value: m.amount }))}
          color="#10B981"
        />
      </View>

      {/* Tier Distribution */}
      <View style={aStyles.chartCard}>
        <Text style={aStyles.chartTitle}>Po razini</Text>
        <DistributionBar
          segments={Object.entries(analytics.tierDistribution).map(([k, v]) => ({
            label: tierLabels[k] || k, value: v, color: tierColors[k] || '#94A3B8',
          }))}
        />
      </View>

      {/* Type Distribution */}
      <View style={aStyles.chartCard}>
        <Text style={aStyles.chartTitle}>Po tipu</Text>
        <DistributionBar
          segments={Object.entries(analytics.typeDistribution).map(([k, v]) => ({
            label: typeLabels[k] || k, value: v, color: typeColors[k] || '#94A3B8',
          }))}
        />
      </View>

      {/* Team Stats */}
      {analytics.teamStats.length > 0 && (
        <View>
          <Text style={[aStyles.chartTitle, { marginBottom: 8 }]}>Učinkovitost tima</Text>
          {analytics.teamStats.map((member) => {
            const rateColor = member.completionRate >= 70 ? '#10B981' : member.completionRate >= 40 ? '#F59E0B' : '#EF4444';
            return (
              <View key={member.id} style={aStyles.teamCard}>
                <View style={aStyles.teamHeader}>
                  <Text style={aStyles.teamName}>{member.name}</Text>
                  <View style={[aStyles.teamBadge, { backgroundColor: rateColor + '20' }]}>
                    <Text style={[aStyles.teamBadgeText, { color: rateColor }]}>{member.completionRate}%</Text>
                  </View>
                </View>
                <View style={aStyles.teamProgressTrack}>
                  <View style={[aStyles.teamProgressFill, { width: `${member.completionRate}%`, backgroundColor: rateColor }]} />
                </View>
                <View style={aStyles.teamStatsRow}>
                  <View style={aStyles.teamStatItem}>
                    <Text style={[aStyles.teamStatNum, { color: '#16A34A' }]}>{member.done}</Text>
                    <Text style={aStyles.teamStatLabel}>Gotovo</Text>
                  </View>
                  <View style={aStyles.teamStatItem}>
                    <Text style={[aStyles.teamStatNum, { color: '#3B82F6' }]}>{member.inProgress}</Text>
                    <Text style={aStyles.teamStatLabel}>U tijeku</Text>
                  </View>
                  <View style={aStyles.teamStatItem}>
                    <Text style={[aStyles.teamStatNum, { color: '#F59E0B' }]}>{member.todo}</Text>
                    <Text style={aStyles.teamStatLabel}>Čeka</Text>
                  </View>
                  <View style={aStyles.teamStatItem}>
                    <Text style={[aStyles.teamStatNum, { color: '#EF4444' }]}>{member.overdue}</Text>
                    <Text style={aStyles.teamStatLabel}>Kasni</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const aStyles = StyleSheet.create({
  container: { marginTop: 8 },
  loadingWrap: { paddingVertical: 20, alignItems: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
  dividerText: { fontSize: 16, fontWeight: '700', color: Colors.gray900, marginHorizontal: 12 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.gray200 },
  kpiLabel: { fontSize: 11, fontWeight: '500', color: Colors.gray500 },
  kpiValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 14,
    marginBottom: 12,
  },
  chartTitle: { fontSize: 13, fontWeight: '600', color: Colors.gray900, marginBottom: 10 },
  chartContainer: { height: 120 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', flex: 1, gap: 4 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { height: 90, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderTopLeftRadius: 3, borderTopRightRadius: 3, minWidth: 8 },
  barLabel: { fontSize: 8, color: Colors.gray400, marginTop: 4 },
  distBar: { flexDirection: 'row', borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  distLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  distLegendItem: { flexDirection: 'row', alignItems: 'center' },
  distDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  distLegendText: { fontSize: 11, color: Colors.gray600 },
  teamCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 14,
    marginBottom: 8,
  },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  teamName: { fontSize: 13, fontWeight: '600', color: Colors.gray900 },
  teamBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  teamBadgeText: { fontSize: 11, fontWeight: '700' },
  teamProgressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.gray100, marginBottom: 10, overflow: 'hidden' },
  teamProgressFill: { height: '100%', borderRadius: 3 },
  teamStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  teamStatItem: { alignItems: 'center' },
  teamStatNum: { fontSize: 16, fontWeight: '700' },
  teamStatLabel: { fontSize: 9, color: Colors.gray400, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  content: { padding: 16, paddingBottom: 32 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  revenueRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
  },
  revenueLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray500,
  },
  revenueValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.accentDark,
    marginTop: 6,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray900,
    marginBottom: 10,
  },
  quickStatsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickStatLabel: {
    fontSize: 14,
    color: Colors.gray600,
  },
  quickStatBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 14,
    marginBottom: 8,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
  },
  memberCompany: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  memberDate: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.gray400,
    padding: 20,
  },
  expiringCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 14,
    marginBottom: 8,
  },
  expiringInfo: {
    flex: 1,
  },
  expiringDate: {
    fontSize: 11,
    color: Colors.danger,
    fontWeight: '500',
    marginTop: 2,
  },
  expiringActions: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  stepBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sendOfferBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sendOfferBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  sentBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
});
