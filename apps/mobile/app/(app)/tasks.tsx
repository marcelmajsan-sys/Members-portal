import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: { id: string; firstName: string; lastName: string };
  createdBy?: { id: string; firstName: string; lastName: string };
  dueAt?: string;
  createdAt: string;
}

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Za napraviti',
  IN_PROGRESS: 'U tijeku',
  DONE: 'Završeno',
};

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  TODO: { bg: Colors.warningLight, text: Colors.warning, border: Colors.warning },
  IN_PROGRESS: { bg: Colors.infoLight, text: Colors.info, border: Colors.info },
  DONE: { bg: Colors.successLight, text: Colors.success, border: Colors.success },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  LOW: { label: 'Nizak', bg: Colors.gray200, text: Colors.gray600 },
  MEDIUM: { label: 'Srednji', bg: Colors.infoLight, text: Colors.info },
  HIGH: { label: 'Visok', bg: '#FFF7ED', text: '#EA580C' },
  URGENT: { label: 'Hitno', bg: Colors.dangerLight, text: Colors.danger },
};

const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('hr-HR', {
    day: 'numeric',
    month: 'short',
  });
}

function getNextStatus(status: TaskStatus): TaskStatus | null {
  if (status === 'TODO') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'DONE';
  return null;
}

function getPrevStatus(status: TaskStatus): TaskStatus | null {
  if (status === 'DONE') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'TODO';
  return null;
}

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const isOwner = user?.role === 'OWNER';

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Task[]>('/api/os/tasks?page=1&limit=100');
      if (res.success && res.data) {
        setTasks(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const changeStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await api.patch(`/api/os/tasks/${taskId}/status`, { status: newStatus });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      Alert.alert('Greška', 'Nije moguće promijeniti status zadatka.');
    }
  };

  const createTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Greška', 'Naslov zadatka je obavezan.');
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        priority: newPriority,
      };
      if (newAssignee.trim()) {
        body.assigneeId = newAssignee.trim();
      }
      if (newDueDate.trim()) {
        body.dueAt = newDueDate.trim();
      }

      const res = await api.post('/api/os/tasks', body);
      if (res.success) {
        setShowCreateModal(false);
        resetCreateForm();
        fetchTasks();
      } else {
        Alert.alert('Greška', 'Nije moguće kreirati zadatak.');
      }
    } catch {
      Alert.alert('Greška', 'Nije moguće kreirati zadatak.');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewPriority('MEDIUM');
    setNewAssignee('');
    setNewDueDate('');
  };

  const groupedTasks = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    tasks: tasks.filter((t) => t.status === status),
    colors: STATUS_COLORS[status],
  }));

  const renderTaskCard = (task: Task) => {
    const priority = PRIORITY_CONFIG[task.priority];
    const nextStatus = getNextStatus(task.status);
    const prevStatus = getPrevStatus(task.status);

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.taskCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/task-detail?id=${task.id}`)}
      >
        <View style={styles.taskCardHeader}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.title}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityText, { color: priority.text }]}>
              {priority.label}
            </Text>
          </View>
        </View>

        <View style={styles.taskCardMeta}>
          {task.assignedTo && (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={13} color={Colors.gray400} />
              <Text style={styles.metaText}>
                {task.assignedTo.firstName} {task.assignedTo.lastName}
              </Text>
            </View>
          )}
          {task.dueAt && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={Colors.gray400} />
              <Text style={styles.metaText}>{formatDate(task.dueAt)}</Text>
            </View>
          )}
        </View>

        <View style={styles.statusActions}>
          {prevStatus && (
            <TouchableOpacity
              style={styles.statusArrow}
              onPress={(e) => {
                e.stopPropagation();
                changeStatus(task.id, prevStatus);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.gray500} />
            </TouchableOpacity>
          )}
          {nextStatus && (
            <TouchableOpacity
              style={styles.statusArrow}
              onPress={(e) => {
                e.stopPropagation();
                changeStatus(task.id, nextStatus);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-forward" size={16} color={Colors.gray500} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = ({ item }: { item: (typeof groupedTasks)[0] }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionDot, { backgroundColor: item.colors.border }]}
        />
        <Text style={styles.sectionTitle}>{item.label}</Text>
        <View style={[styles.countBadge, { backgroundColor: item.colors.bg }]}>
          <Text style={[styles.countText, { color: item.colors.text }]}>
            {item.tasks.length}
          </Text>
        </View>
      </View>
      {item.tasks.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>Nema zadataka</Text>
        </View>
      ) : (
        item.tasks.map(renderTaskCard)
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groupedTasks}
        keyExtractor={(item) => item.status}
        renderItem={renderSection}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchTasks}
            tintColor={Colors.primary}
          />
        }
      />

      {isOwner && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={28} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Create Task Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Odustani</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Novi zadatak</Text>
            <TouchableOpacity onPress={createTask} disabled={creating}>
              <Text
                style={[
                  styles.modalSave,
                  creating && { opacity: 0.5 },
                ]}
              >
                {creating ? 'Spremam...' : 'Spremi'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Naslov *</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Unesite naslov zadatka"
              placeholderTextColor={Colors.gray400}
            />

            <Text style={styles.fieldLabel}>Opis</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Unesite opis (opcionalno)"
              placeholderTextColor={Colors.gray400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Prioritet</Text>
            <View style={styles.priorityPicker}>
              {PRIORITY_OPTIONS.map((p) => {
                const config = PRIORITY_CONFIG[p];
                const selected = newPriority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: selected ? config.bg : Colors.gray100 },
                      selected && { borderColor: config.text, borderWidth: 1.5 },
                    ]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        { color: selected ? config.text : Colors.gray500 },
                        selected && { fontWeight: '600' },
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>ID zadužene osobe (opcionalno)</Text>
            <TextInput
              style={styles.textInput}
              value={newAssignee}
              onChangeText={setNewAssignee}
              placeholder="ID korisnika"
              placeholderTextColor={Colors.gray400}
            />

            <Text style={styles.fieldLabel}>Rok (opcionalno)</Text>
            <TextInput
              style={styles.textInput}
              value={newDueDate}
              onChangeText={setNewDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.gray400}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
    flex: 1,
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptySection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 20,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptySectionText: {
    color: Colors.gray400,
    fontSize: 13,
  },
  taskCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 14,
    marginBottom: 8,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  statusArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  modalCancel: {
    fontSize: 15,
    color: Colors.gray500,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
  },
  modalSave: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 6,
    marginTop: 14,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.gray900,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  priorityPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
