import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  steps: Array<{ type: string; config: Record<string, unknown>; order: number }>;
  status: string;
  _count: { logs: number };
}

const TRIGGER_LABELS: Record<string, string> = {
  'member.expiry_reminder': 'Podsjetnik prije isteka',
  'member.activated': 'Aktivacija članstva',
  'member.expired': 'Istek članstva',
  'payment.completed': 'Uspješno plaćanje',
};

interface Preset {
  name: string;
  description: string;
  triggerEvent: string;
  steps: Array<{ type: string; config: Record<string, unknown>; order: number }>;
}

const PRESETS: Preset[] = [
  {
    name: 'Podsjetnik 30 dana prije isteka',
    description: 'Šalje email podsjetnik 30 dana prije isteka članstva',
    triggerEvent: 'member.expiry_reminder',
    steps: [
      { type: 'CONDITION', config: { field: 'daysUntilExpiry', operator: '<=', value: 30 }, order: 1 },
      { type: 'SEND_EMAIL', config: { template: 'expiry_reminder_30' }, order: 2 },
    ],
  },
  {
    name: 'Podsjetnik 14 dana prije isteka',
    description: 'Šalje email podsjetnik 14 dana prije isteka članstva',
    triggerEvent: 'member.expiry_reminder',
    steps: [
      { type: 'CONDITION', config: { field: 'daysUntilExpiry', operator: '<=', value: 14 }, order: 1 },
      { type: 'SEND_EMAIL', config: { template: 'expiry_reminder_14' }, order: 2 },
    ],
  },
  {
    name: 'Dobrodošlica novom članu',
    description: 'Šalje email dobrodošlice nakon aktivacije članstva',
    triggerEvent: 'member.activated',
    steps: [
      { type: 'SEND_EMAIL', config: { template: 'welcome' }, order: 1 },
    ],
  },
];

export default function AutomationScreen() {
  const router = useRouter();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    const res = await api.get<Sequence[]>('/api/os/sequences?page=1&limit=50');
    if (res.success && res.data) {
      setSequences(res.data);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchSequences();
      setLoading(false);
    })();
  }, [fetchSequences]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchSequences();
    setRefreshing(false);
  }

  async function handleToggle(sequence: Sequence) {
    const newStatus = sequence.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingId(sequence.id);
    const res = await api.patch(`/api/os/sequences/${sequence.id}/status`, {
      status: newStatus,
    });
    if (res.success) {
      setSequences((prev) =>
        prev.map((s) => (s.id === sequence.id ? { ...s, status: newStatus } : s))
      );
    } else {
      Alert.alert('Greška', 'Nije moguće promijeniti status automatizacije.');
    }
    setTogglingId(null);
  }

  function handleDelete(sequence: Sequence) {
    Alert.alert(
      'Brisanje',
      `Jeste li sigurni da želite obrisati "${sequence.name}"?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            const res = await api.del(`/api/os/sequences/${sequence.id}`);
            if (res.success) {
              setSequences((prev) => prev.filter((s) => s.id !== sequence.id));
            } else {
              Alert.alert('Greška', 'Nije moguće obrisati automatizaciju.');
            }
          },
        },
      ]
    );
  }

  async function handleCreatePreset(preset: Preset) {
    setShowPresets(false);
    const res = await api.post<Sequence>('/api/os/sequences', {
      name: preset.name,
      description: preset.description,
      triggerEvent: preset.triggerEvent,
      steps: preset.steps,
      status: 'ACTIVE',
    });
    if (res.success && res.data) {
      setSequences((prev) => [res.data!, ...prev]);
    } else {
      Alert.alert('Greška', 'Nije moguće kreirati automatizaciju.');
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Automatizacija',
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Automatizacija',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: '600' },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowPresets(true)}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={26} color={Colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={sequences}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="flash-off-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>Nema automatizacija</Text>
            <Text style={styles.emptySubtext}>
              Pritisnite + za kreiranje nove
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.status === 'ACTIVE';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Switch
                  value={isActive}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ false: Colors.gray300, true: Colors.success + '60' }}
                  thumbColor={isActive ? Colors.success : Colors.gray400}
                  disabled={togglingId === item.id}
                />
              </View>

              <View style={styles.cardMeta}>
                <View style={styles.metaTag}>
                  <Ionicons
                    name="flash-outline"
                    size={14}
                    color={Colors.gray500}
                  />
                  <Text style={styles.metaText}>
                    {TRIGGER_LABELS[item.triggerEvent] || item.triggerEvent}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: isActive ? Colors.successLight : Colors.gray100 },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: isActive ? Colors.success : Colors.gray500 },
                    ]}
                  >
                    {isActive ? 'Aktivna' : 'Pauzirana'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.execCount}>
                  {item._count.logs} izvršavanja
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={showPresets}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPresets(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova automatizacija</Text>
              <TouchableOpacity
                onPress={() => setShowPresets(false)}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={styles.presetRow}
                onPress={() => handleCreatePreset(preset)}
                activeOpacity={0.6}
              >
                <View style={styles.presetIcon}>
                  <Ionicons name="flash" size={20} color={Colors.accent} />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>
                </View>
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
  },
  headerButton: {
    marginRight: 4,
    padding: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.gray50,
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray900,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.gray500,
    marginTop: 4,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  execCount: {
    fontSize: 12,
    color: Colors.gray400,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.gray500,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtext: {
    color: Colors.gray400,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
    marginRight: 12,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray800,
  },
  presetDesc: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
});
