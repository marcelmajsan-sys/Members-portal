import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

interface MemberRaw {
  id: string;
  memberType: string;
  memberTier: string;
  status: string;
  joinedAt: string | null;
  expiresAt: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
  company: { name: string };
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktivan',
  PENDING: 'Na čekanju',
  EXPIRED: 'Istekao',
  SUSPENDED: 'Suspendiran',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: Colors.successLight, text: Colors.success },
  PENDING: { bg: Colors.warningLight, text: Colors.warning },
  EXPIRED: { bg: Colors.dangerLight, text: Colors.danger },
  SUSPENDED: { bg: Colors.gray200, text: Colors.gray500 },
};

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Web trgovac',
  SERVICE_PROVIDER: 'Nuditelj usluga',
  PHYSICAL: 'Fizički član',
};

const TIER_LABELS: Record<string, string> = {
  FREE: 'Besplatno',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  FREE: { bg: Colors.gray200, text: Colors.gray600 },
  STANDARD: { bg: '#DBEAFE', text: '#1D4ED8' },
  PREMIUM: { bg: '#EDE9FE', text: '#7C3AED' },
};

function getDaysUntilExpiry(expiresAt: string | null): { text: string; color: string } | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `isteklo prije ${Math.abs(diffDays)} dana`, color: Colors.danger };
  }
  if (diffDays <= 7) {
    return { text: `${diffDays} dana`, color: Colors.danger };
  }
  if (diffDays <= 30) {
    return { text: `${diffDays} dana`, color: Colors.warning };
  }
  return { text: `${diffDays} dana`, color: Colors.success };
}

export default function MembersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sentActions, setSentActions] = useState<Record<string, 'notify'>>({});
  const sentTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isOwner = user?.role === 'OWNER';

  const fetchMembers = useCallback(async (pageNum: number, replace: boolean) => {
    const res = await api.get<MemberRaw[]>(`/api/os/members?page=${pageNum}&limit=20`);
    if (res.success && res.data) {
      if (replace) {
        setMembers(res.data);
      } else {
        setMembers((prev) => [...prev, ...res.data!]);
      }
      setHasMore(res.data.length === 20);
    }
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      setLoading(true);
      await fetchMembers(1, true);
      setPage(1);
      setLoading(false);
    })();
  }, [isOwner, fetchMembers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchMembers(1, true);
    setHasMore(true);
    setRefreshing(false);
  }, [fetchMembers]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchMembers(nextPage, false);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchMembers]);

  const showCheckmark = useCallback((memberId: string, type: 'notify') => {
    setSentActions((prev) => ({ ...prev, [memberId]: type }));
    if (sentTimers.current[memberId]) {
      clearTimeout(sentTimers.current[memberId]);
    }
    sentTimers.current[memberId] = setTimeout(() => {
      setSentActions((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
    }, 2000);
  }, []);

  const sendNotification = useCallback(async (member: MemberRaw) => {
    const fullName = `${member.user.firstName} ${member.user.lastName}`;
    const res = await api.post(`/api/os/members/${member.id}/notify`, {
      title: 'Obavijest od udruge',
      message: `Poštovani ${fullName}, obavještavamo Vas o novostima iz udruge eCommerce Hrvatska.`,
      type: 'INFO',
    });
    if (res.success) {
      showCheckmark(member.id, 'notify');
      Alert.alert('Uspjeh', 'Obavijest je poslana.');
    } else {
      Alert.alert('Greška', res.error?.message || 'Slanje obavijesti nije uspjelo.');
    }
  }, [showCheckmark]);

  if (!isOwner) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Nemate pristup ovoj stranici.</Text>
      </View>
    );
  }

  if (loading && members.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Učitavanje članova...</Text>
      </View>
    );
  }

  const renderMember = ({ item }: { item: MemberRaw }) => {
    const statusColor = STATUS_COLORS[item.status] || { bg: Colors.gray100, text: Colors.gray500 };
    const statusLabel = STATUS_LABELS[item.status] || item.status;
    const typeLabel = TYPE_LABELS[item.memberType] || item.memberType;
    const tierColor = TIER_COLORS[item.memberTier] || { bg: Colors.gray200, text: Colors.gray500 };
    const tierLabel = TIER_LABELS[item.memberTier] || item.memberTier;
    const expiry = getDaysUntilExpiry(item.expiresAt);
    const sentAction = sentActions[item.id];

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => router.push({ pathname: '/member-detail', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.memberHeader}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {item.user.firstName} {item.user.lastName}
            </Text>
            <Text style={styles.memberEmail}>{item.user.email}</Text>
            <Text style={styles.memberCompany}>{item.company.name}</Text>
            <Text style={styles.memberType}>{typeLabel}</Text>
          </View>
          <View style={styles.memberMeta}>
            <View style={[styles.statusBadge, { backgroundColor: tierColor.bg }]}>
              <Text style={[styles.statusText, { color: tierColor.text }]}>{tierLabel}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg, marginTop: 4 }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>{statusLabel}</Text>
            </View>
            {expiry && (
              <Text style={[styles.expiryText, { color: expiry.color }]}>{expiry.text}</Text>
            )}
          </View>
        </View>
        <View style={styles.actionsRow}>
          {sentAction === 'notify' ? (
            <View style={[styles.actionButton, styles.notifyButton, styles.sentButton]}>
              <Text style={styles.notifyText}>✓</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.notifyButton]}
              onPress={() => sendNotification(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.notifyText}>Obavijest</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      renderItem={renderMember}
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Nema članova za prikaz.</Text>
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={styles.footerLoader}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.gray500,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.gray50,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  memberCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 14,
    marginBottom: 10,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberInfo: {
    flex: 1,
    marginRight: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
  },
  memberEmail: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
  memberCompany: {
    fontSize: 12,
    color: Colors.gray600,
    fontWeight: '500',
    marginTop: 4,
  },
  memberType: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 2,
  },
  memberMeta: {
    alignItems: 'flex-end',
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
  expiryText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyButton: {
    backgroundColor: Colors.infoLight,
  },
  sentButton: {
    opacity: 0.7,
  },
  notifyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.info,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.gray400,
    padding: 20,
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
