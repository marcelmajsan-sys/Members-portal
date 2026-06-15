import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

interface MemberDetail {
  id: string;
  memberType: string;
  memberTier: string;
  status: string;
  joinedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; role: string };
  company: {
    name: string;
    oib: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    website: string | null;
    phone: string | null;
  };
  payments: Array<{
    id: string;
    description: string | null;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
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

const TIER_PRICING: Record<string, Record<string, number | null>> = {
  WEB_TRADER: { FREE: 0, STANDARD: 300, PREMIUM: 2000 },
  SERVICE_PROVIDER: { FREE: 0, STANDARD: 400, PREMIUM: 1500 },
  PHYSICAL: { FREE: 0, STANDARD: 250, PREMIUM: null },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('hr-HR');
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount);
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Array<{ id: string; content: string; createdAt: string; author: { firstName: string; lastName: string } }>>([]);
  const [emails, setEmails] = useState<Array<{ id: string; subject: string; templateName: string | null; sentAt: string }>>([]);
  const [newNote, setNewNote] = useState('');

  const fetchMember = useCallback(async () => {
    const res = await api.get<MemberDetail>(`/api/os/members/${id}`);
    if (res.success && res.data) {
      setMember(res.data);
    }
    const notesRes = await api.get<typeof notes>(`/api/os/members/${id}/notes`);
    if (notesRes.success && notesRes.data) setNotes(notesRes.data);
    const emailsRes = await api.get<typeof emails>(`/api/os/members/${id}/emails`);
    if (emailsRes.success && emailsRes.data) setEmails(emailsRes.data);
  }, [id]);

  useEffect(() => {
    (async () => {
      await fetchMember();
      setLoading(false);
    })();
  }, [fetchMember]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMember();
    setRefreshing(false);
  };

  const [offerStep, setOfferStep] = useState(0);

  // Fetch offer step
  useEffect(() => {
    api.get<{ step: number }>(`/api/os/members/${id}/offer-step`).then((res) => {
      if (res.success && res.data) setOfferStep(res.data.step);
    });
  }, [id]);

  const sendOffer = async () => {
    setActionLoading('offer');
    const res = await api.post<{ offer: { id: string; offerNumber: string; step: number; amount: number } }>(`/api/os/members/${id}/send-offer`, {});
    setActionLoading(null);
    if (res.success && res.data) {
      setOfferStep(res.data.offer.step);
      Alert.alert('Uspjeh', `${res.data.offer.step}. obavijest s predračunom br. ${res.data.offer.offerNumber} poslana!`);
      // Refresh emails
      const emailsRes = await api.get<typeof emails>(`/api/os/members/${id}/emails`);
      if (emailsRes.success && emailsRes.data) setEmails(emailsRes.data);
    } else {
      Alert.alert('Greška', res.error?.message || 'Slanje ponude nije uspjelo.');
    }
  };

  const changeTier = () => {
    if (!member) return;
    const tiers: Array<{ tier: string; label: string; price: number }> = [];
    for (const tier of ['FREE', 'STANDARD', 'PREMIUM'] as const) {
      const price = TIER_PRICING[member.memberType]?.[tier];
      if (price === null) continue;
      const priceLabel = price === 0 ? 'besplatno' : `${price} EUR/god`;
      tiers.push({ tier, label: `${TIER_LABELS[tier]} (${priceLabel})`, price });
    }

    Alert.alert(
      'Promijeni razinu članstva',
      `Trenutna razina: ${TIER_LABELS[member.memberTier]}`,
      [
        ...tiers
          .filter((t) => t.tier !== member.memberTier)
          .map((t) => ({
            text: t.label,
            onPress: () => {
              const oldPrice = TIER_PRICING[member.memberType]?.[member.memberTier] ?? 0;
              const diff = t.price - oldPrice;
              const isUpgrade = diff > 0;

              if (isUpgrade) {
                Alert.alert(
                  'Naplati razliku?',
                  `Nadogradnja s ${TIER_LABELS[member.memberTier]} na ${TIER_LABELS[t.tier]}.\n\nRazlika u cijeni: ${diff} EUR`,
                  [
                    {
                      text: 'Da, naplati razliku',
                      onPress: () => applyTierChange(t.tier, true),
                    },
                    {
                      text: 'Ne, samo promijeni',
                      onPress: () => applyTierChange(t.tier, false),
                    },
                    { text: 'Odustani', style: 'cancel' },
                  ],
                );
              } else {
                applyTierChange(t.tier, false);
              }
            },
          })),
        { text: 'Odustani', style: 'cancel' },
      ],
    );
  };

  const applyTierChange = async (tier: string, charge: boolean) => {
    setActionLoading('tier');
    const res = await api.patch<MemberDetail & { charged?: number }>(`/api/os/members/${id}/tier`, { tier, charge });
    setActionLoading(null);
    if (res.success && res.data) {
      setMember(res.data);
      const chargedMsg = res.data.charged ? `\nNaplaćena razlika: ${res.data.charged} EUR` : '';
      Alert.alert('Uspjeh', `Razina promijenjena u ${TIER_LABELS[tier]}.${chargedMsg}`);
    } else {
      Alert.alert('Greška', res.error?.message || 'Promjena razine nije uspjela.');
    }
  };

  const renewMembership = async () => {
    if (!member) return;

    if (member.memberTier === 'FREE') {
      Alert.alert('Nije moguće', 'Besplatni članovi ne mogu produžiti članstvo. Prvo promijenite razinu.');
      return;
    }

    const price = TIER_PRICING[member.memberType]?.[member.memberTier];
    if (price === null || price === undefined) {
      Alert.alert('Greška', 'Cijena za ovu kombinaciju nije dostupna.');
      return;
    }

    Alert.alert(
      'Produži članstvo',
      `Produži članstvo za ${member.user.firstName} ${member.user.lastName} za 1 godinu?\n\nRazina: ${TIER_LABELS[member.memberTier]}\nIznos: ${price} EUR`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Produži',
          onPress: async () => {
            setActionLoading('renew');
            const res = await api.post<MemberDetail>(`/api/os/members/${id}/renew`, {
              amount: price,
            });
            setActionLoading(null);
            if (res.success && res.data) {
              setMember(res.data);
              Alert.alert('Uspjeh', 'Članstvo je produženo.');
            } else {
              Alert.alert('Greška', res.error?.message || 'Produženje članstva nije uspjelo.');
            }
          },
        },
      ],
    );
  };

  const sendNotification = async () => {
    if (!member) return;
    setActionLoading('notify');
    const fullName = `${member.user.firstName} ${member.user.lastName}`;
    const res = await api.post(`/api/os/members/${id}/notify`, {
      title: 'Obavijest od udruge',
      message: `Poštovani ${fullName}, obavještavamo Vas o novostima iz udruge eCommerce Hrvatska.`,
      type: 'INFO',
    });
    setActionLoading(null);
    if (res.success) {
      Alert.alert('Uspjeh', 'Obavijest je poslana.');
    } else {
      Alert.alert('Greška', 'Slanje obavijesti nije uspjelo.');
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const res = await api.post<typeof notes[0]>(`/api/os/members/${id}/notes`, { content: newNote.trim() });
    if (res.success && res.data) {
      setNotes((prev) => [res.data!, ...prev]);
      setNewNote('');
    } else {
      Alert.alert('Greška', 'Dodavanje bilješke nije uspjelo.');
    }
  };

  const deleteNote = (noteId: string) => {
    Alert.alert('Obriši bilješku?', '', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: async () => {
          const res = await api.del(`/api/os/members/${id}/notes/${noteId}`);
          if (res.success) {
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
          }
        },
      },
    ]);
  };

  const templateLabels: Record<string, string> = {
    renewal_confirmation: 'Potvrda produženja',
    renewal_reminder: 'Podsjetnik',
    free_upgrade: 'Ponuda za upgrade',
    custom_notification: 'Obavijest',
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Član' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  if (!member) {
    return (
      <>
        <Stack.Screen options={{ title: 'Član' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Član nije pronađen.</Text>
        </View>
      </>
    );
  }

  const statusColor = STATUS_COLORS[member.status] || { bg: Colors.gray100, text: Colors.gray500 };
  const statusLabel = STATUS_LABELS[member.status] || member.status;
  const typeLabel = TYPE_LABELS[member.memberType] || member.memberType;
  const tierColor = TIER_COLORS[member.memberTier] || { bg: Colors.gray200, text: Colors.gray500 };
  const tierLabel = TIER_LABELS[member.memberTier] || member.memberTier;

  return (
    <>
      <Stack.Screen
        options={{ title: `${member.user.firstName} ${member.user.lastName}` }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.user.firstName?.[0]}
              {member.user.lastName?.[0]}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {member.user.firstName} {member.user.lastName}
          </Text>
          <Text style={styles.profileEmail}>{member.user.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: tierColor.bg }]}>
              <Text style={[styles.badgeText, { color: tierColor.text }]}>{tierLabel}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.badgeText, { color: statusColor.text }]}>{statusLabel}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.primary + '15' }]}>
              <Text style={[styles.badgeText, { color: Colors.primary }]}>{typeLabel}</Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalji</Text>
          <View style={styles.detailCard}>
            <DetailRow label="Razina članstva" value={tierLabel} />
            <DetailRow label="Datum učlanjenja" value={formatDate(member.joinedAt)} />
            <DetailRow label="Članstvo ističe" value={formatDate(member.expiresAt)} />
            {member.notes && <DetailRow label="Bilješke" value={member.notes} />}
          </View>
        </View>

        {/* Company */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tvrtka</Text>
          <View style={styles.detailCard}>
            <DetailRow label="Naziv" value={member.company.name} />
            {member.company.oib && <DetailRow label="OIB" value={member.company.oib} />}
            {member.company.address && <DetailRow label="Adresa" value={member.company.address} />}
            {member.company.city && <DetailRow label="Grad" value={member.company.city} />}
            {member.company.website && <DetailRow label="Web" value={member.company.website} />}
            {member.company.phone && <DetailRow label="Telefon" value={member.company.phone} />}
          </View>
        </View>

        {/* Actions */}
        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Akcije</Text>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: tierColor.bg, marginBottom: 10 }]}
              onPress={changeTier}
              disabled={actionLoading !== null}
              activeOpacity={0.7}
            >
              {actionLoading === 'tier' ? (
                <ActivityIndicator size="small" color={tierColor.text} />
              ) : (
                <>
                  <Ionicons name="swap-vertical-outline" size={18} color={tierColor.text} />
                  <Text style={[styles.actionBtnText, { color: tierColor.text }]}>
                    Promijeni razinu
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.primary + '15', marginBottom: 10, opacity: member.memberTier === 'FREE' ? 0.5 : 1 }]}
              onPress={renewMembership}
              disabled={actionLoading !== null}
              activeOpacity={0.7}
            >
              {actionLoading === 'renew' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.actionBtnText, { color: Colors.primary }]}>
                    Produži članstvo
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {/* Send offer flow */}
            {member.memberTier !== 'FREE' && (
              <View style={styles.offerSection}>
                <View style={styles.offerBadgesRow}>
                  {offerStep >= 1 && (
                    <View style={[styles.offerBadge, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.offerBadgeText, { color: '#1D4ED8' }]}>1. poslana</Text>
                    </View>
                  )}
                  {offerStep >= 2 && (
                    <View style={[styles.offerBadge, { backgroundColor: '#FFF7ED' }]}>
                      <Text style={[styles.offerBadgeText, { color: '#C2410C' }]}>2. poslana</Text>
                    </View>
                  )}
                </View>
                {offerStep < 2 && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: offerStep === 0 ? '#16A34A' : '#F97316', marginBottom: 10 }]}
                    onPress={sendOffer}
                    disabled={actionLoading !== null}
                    activeOpacity={0.7}
                  >
                    {actionLoading === 'offer' ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="document-text-outline" size={18} color={Colors.white} />
                        <Text style={[styles.actionBtnText, { color: Colors.white }]}>
                          {`Pošalji ${offerStep + 1}. obavijest + predračun`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.infoLight }]}
                onPress={sendNotification}
                disabled={actionLoading !== null}
                activeOpacity={0.7}
              >
                {actionLoading === 'notify' ? (
                  <ActivityIndicator size="small" color={Colors.info} />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={18} color={Colors.info} />
                    <Text style={[styles.actionBtnText, { color: Colors.info }]}>
                      Obavijest
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent payments */}
        {member.payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zadnja plaćanja</Text>
            {member.payments.map((p) => (
              <View key={p.id} style={styles.paymentCard}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentDesc}>
                    {p.description || 'Uplata'}
                  </Text>
                  <Text style={styles.paymentDate}>{formatDate(p.createdAt)}</Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(p.amount, p.currency)}
                  </Text>
                  <Text
                    style={[
                      styles.paymentStatus,
                      {
                        color:
                          p.status === 'PAID'
                            ? Colors.success
                            : p.status === 'PENDING'
                              ? Colors.warning
                              : Colors.gray500,
                      },
                    ]}
                  >
                    {p.status === 'PAID' ? 'Plaćeno' : p.status === 'PENDING' ? 'Čeka' : p.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bilješke</Text>
          <View style={styles.noteInputRow}>
            <TextInput
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Dodaj bilješku..."
              style={styles.noteInput}
              returnKeyType="send"
              onSubmitEditing={addNote}
            />
            <TouchableOpacity
              style={[styles.noteAddBtn, !newNote.trim() && { opacity: 0.5 }]}
              onPress={addNote}
              disabled={!newNote.trim()}
            >
              <Text style={styles.noteAddBtnText}>Dodaj</Text>
            </TouchableOpacity>
          </View>
          {notes.length === 0 ? (
            <Text style={styles.emptyText}>Nema bilješki</Text>
          ) : (
            notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                onLongPress={() => deleteNote(note.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.noteContent}>{note.content}</Text>
                <Text style={styles.noteMeta}>
                  {note.author.firstName} {note.author.lastName} · {formatDate(note.createdAt)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Email History */}
        {emails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Poslani emailovi</Text>
            {emails.map((e) => (
              <View key={e.id} style={styles.emailCard}>
                <Text style={styles.emailSubject}>{e.subject}</Text>
                <View style={styles.emailMeta}>
                  {e.templateName && (
                    <View style={styles.emailBadge}>
                      <Text style={styles.emailBadgeText}>
                        {templateLabels[e.templateName] || e.templateName}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.emailDate}>
                    {new Date(e.sentAt).toLocaleDateString('hr-HR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.gray500,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.gray500,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray900,
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray900,
  },
  paymentDate: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.gray900,
  },
  noteAddBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  noteAddBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 12,
    marginBottom: 6,
  },
  noteContent: {
    fontSize: 13,
    color: Colors.gray900,
    lineHeight: 18,
  },
  noteMeta: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.gray400,
    fontSize: 13,
    paddingVertical: 16,
  },
  emailCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 12,
    marginBottom: 6,
  },
  emailSubject: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray900,
  },
  emailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  emailBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  emailBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  emailDate: {
    fontSize: 11,
    color: Colors.gray400,
  },
  offerSection: {
    marginBottom: 10,
  },
  offerBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  offerBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
