import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: string };
}

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
  comments?: TaskComment[];
}

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  TODO: { label: 'Za napraviti', bg: Colors.warningLight, text: Colors.warning },
  IN_PROGRESS: { label: 'U tijeku', bg: Colors.infoLight, text: Colors.info },
  DONE: { label: 'Završeno', bg: Colors.successLight, text: Colors.success },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  LOW: { label: 'Nizak', bg: Colors.gray200, text: Colors.gray600 },
  MEDIUM: { label: 'Srednji', bg: Colors.infoLight, text: Colors.info },
  HIGH: { label: 'Visok', bg: '#FFF7ED', text: '#EA580C' },
  URGENT: { label: 'Hitno', bg: Colors.dangerLight, text: Colors.danger },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('hr-HR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.toLocaleDateString('hr-HR', {
    day: 'numeric',
    month: 'short',
  })} ${date.toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<Task>(`/api/os/tasks/${id}`);
      if (res.success && res.data) {
        setTask(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const changeStatus = async (newStatus: TaskStatus) => {
    if (!task) return;
    setChangingStatus(true);
    try {
      const res = await api.patch(`/api/os/tasks/${task.id}/status`, { status: newStatus });
      if (res.success) {
        setTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      } else {
        Alert.alert('Greška', 'Nije moguće promijeniti status.');
      }
    } catch {
      Alert.alert('Greška', 'Nije moguće promijeniti status.');
    } finally {
      setChangingStatus(false);
    }
  };

  const postComment = async () => {
    if (!task || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post<TaskComment>(`/api/os/tasks/${task.id}/comments`, {
        content: commentText.trim(),
      });
      if (res.success && res.data) {
        setTask((prev) =>
          prev
            ? { ...prev, comments: [...(prev.comments || []), res.data!] }
            : null
        );
        setCommentText('');
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Greška', 'Nije moguće poslati komentar.');
      }
    } catch {
      Alert.alert('Greška', 'Nije moguće poslati komentar.');
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Zadatak',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Učitavanje zadatka...</Text>
        </View>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Zadatak',
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Zadatak nije pronađen.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Natrag</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const comments = task.comments || [];

  const statusBannerText = () => {
    if (task.status === 'TODO') return 'Čeka preuzimanje';
    if (task.status === 'IN_PROGRESS' && task.assignedTo) {
      return `Preuzeo/la: ${task.assignedTo.firstName} ${task.assignedTo.lastName}`;
    }
    if (task.status === 'IN_PROGRESS') return 'U tijeku';
    return 'Završeno';
  };

  const bannerColors: Record<TaskStatus, { bg: string; text: string }> = {
    TODO: { bg: Colors.warningLight, text: Colors.warning },
    IN_PROGRESS: { bg: Colors.infoLight, text: Colors.info },
    DONE: { bg: Colors.successLight, text: Colors.success },
  };

  const banner = bannerColors[task.status];

  return (
    <>
      <Stack.Screen options={{ title: 'Zadatak' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: banner.bg }]}>
            <Ionicons
              name={
                task.status === 'TODO'
                  ? 'time-outline'
                  : task.status === 'IN_PROGRESS'
                  ? 'play-circle-outline'
                  : 'checkmark-circle-outline'
              }
              size={20}
              color={banner.text}
            />
            <Text style={[styles.statusBannerText, { color: banner.text }]}>
              {statusBannerText()}
            </Text>
          </View>

          {/* Title & Badges */}
          <View style={styles.headerSection}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.badgeText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: priorityConfig.bg }]}>
                <Text style={[styles.badgeText, { color: priorityConfig.text }]}>
                  {priorityConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {task.description && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Opis</Text>
              <Text style={styles.descriptionText}>{task.description}</Text>
            </View>
          )}

          {/* Details */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Detalji</Text>

            {task.createdBy && (
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color={Colors.gray400} />
                <Text style={styles.detailLabel}>Kreirao/la:</Text>
                <Text style={styles.detailValue}>
                  {task.createdBy.firstName} {task.createdBy.lastName}
                </Text>
              </View>
            )}

            {task.assignedTo && (
              <View style={styles.detailRow}>
                <Ionicons name="person-circle-outline" size={16} color={Colors.gray400} />
                <Text style={styles.detailLabel}>Zadužen/a:</Text>
                <Text style={styles.detailValue}>
                  {task.assignedTo.firstName} {task.assignedTo.lastName}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.gray400} />
              <Text style={styles.detailLabel}>Kreirano:</Text>
              <Text style={styles.detailValue}>{formatDate(task.createdAt)}</Text>
            </View>

            {task.dueAt && (
              <View style={styles.detailRow}>
                <Ionicons name="alarm-outline" size={16} color={Colors.gray400} />
                <Text style={styles.detailLabel}>Rok:</Text>
                <Text style={styles.detailValue}>{formatDate(task.dueAt)}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsCard}>
            {task.status === 'TODO' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.info }]}
                onPress={() => changeStatus('IN_PROGRESS')}
                disabled={changingStatus}
              >
                <Ionicons name="play" size={18} color={Colors.white} />
                <Text style={styles.actionButtonText}>Preuzmi zadatak</Text>
              </TouchableOpacity>
            )}
            {task.status === 'IN_PROGRESS' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.success }]}
                  onPress={() => changeStatus('DONE')}
                  disabled={changingStatus}
                >
                  <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Završi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonOutline]}
                  onPress={() => changeStatus('TODO')}
                  disabled={changingStatus}
                >
                  <Ionicons name="arrow-undo" size={18} color={Colors.gray600} />
                  <Text style={[styles.actionButtonText, { color: Colors.gray700 }]}>
                    Vrati
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {task.status === 'DONE' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonOutline]}
                onPress={() => changeStatus('TODO')}
                disabled={changingStatus}
              >
                <Ionicons name="arrow-undo" size={18} color={Colors.gray600} />
                <Text style={[styles.actionButtonText, { color: Colors.gray700 }]}>
                  Vrati
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Komentari ({comments.length})
            </Text>

            {comments.length === 0 && (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>Nema komentara</Text>
              </View>
            )}

            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {getInitials(comment.user.firstName, comment.user.lastName)}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {comment.user.firstName} {comment.user.lastName}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatDateTime(comment.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Napišite komentar..."
            placeholderTextColor={Colors.gray400}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || sendingComment) && styles.sendButtonDisabled,
            ]}
            onPress={postComment}
            disabled={!commentText.trim() || sendingComment}
          >
            {sendingComment ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.gray500,
    fontSize: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 15,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerSection: {
    padding: 16,
    paddingBottom: 12,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.gray700,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.gray500,
    width: 90,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.gray900,
    fontWeight: '500',
    flex: 1,
  },
  actionsCard: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  commentsSection: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 12,
  },
  emptyComments: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyCommentsText: {
    color: Colors.gray400,
    fontSize: 13,
  },
  commentCard: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  commentBody: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray900,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.gray400,
  },
  commentContent: {
    fontSize: 14,
    color: Colors.gray700,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.gray900,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
});
