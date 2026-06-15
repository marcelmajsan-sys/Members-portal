import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Vlasnik',
  OPERATOR: 'Operator',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: Colors.primary,
  OPERATOR: Colors.info,
};

export default function TeamScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const res = await api.get<Employee[]>('/api/os/employees?page=1&limit=50');
    if (res.success && res.data) {
      setEmployees(res.data);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchEmployees();
      setLoading(false);
    })();
  }, [fetchEmployees]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Tim' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Tim' }} />

      <FlatList
        data={employees}
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
            <Ionicons name="people-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>Nema članova tima</Text>
          </View>
        }
        renderItem={({ item }) => {
          const roleColor = ROLE_COLORS[item.role] || Colors.gray500;
          const roleLabel = ROLE_LABELS[item.role] || item.role;
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.firstName?.[0]}
                  {item.lastName?.[0]}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.email}>{item.email}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                    <Text style={[styles.roleText, { color: roleColor }]}>
                      {roleLabel}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: item.isActive
                            ? Colors.success
                            : Colors.gray400,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusLabel,
                        {
                          color: item.isActive
                            ? Colors.success
                            : Colors.gray400,
                        },
                      ]}
                    >
                      {item.isActive ? 'Aktivan' : 'Neaktivan'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
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
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray900,
  },
  email: {
    fontSize: 13,
    color: Colors.gray500,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '500',
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
});
