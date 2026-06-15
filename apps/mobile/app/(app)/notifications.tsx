import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNotifications } from '@/hooks/use-notifications';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Colors } from '@/constants/colors';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `prije ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `prije ${hours}h`;
  const days = Math.floor(hours / 24);
  return `prije ${days}d`;
}

export default function NotificationsScreen() {
  const { notifications, loading, refetch, markAsRead } = useNotifications();

  if (loading && notifications.length === 0) {
    return <LoadingScreen message="Učitavanje obavijesti..." />;
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nema obavijesti</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, !item.isRead && styles.unreadCard]}
          onPress={() => !item.isRead && markAsRead(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
    marginBottom: 10,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray700,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: Colors.gray900,
  },
  message: {
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.gray400,
    fontSize: 14,
  },
});
