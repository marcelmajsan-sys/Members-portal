import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/constants/colors';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  ownerOnly?: boolean;
}

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const isOwner = user?.role === 'OWNER';

  function handleLogout() {
    Alert.alert('Odjava', 'Jeste li sigurni da se želite odjaviti?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Odjavi se',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'flash-outline',
      label: 'Automatizacija',
      onPress: () => router.push('/automation'),
      ownerOnly: true,
    },
    {
      icon: 'people-outline',
      label: 'Tim',
      onPress: () => router.push('/team'),
      ownerOnly: true,
    },
  ];

  const visibleItems = menuItems.filter(
    (item) => !item.ownerOnly || isOwner
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      {visibleItems.length > 0 && (
        <View style={styles.menuSection}>
          {visibleItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                index < visibleItems.length - 1 && styles.menuRowBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={styles.menuRowLeft}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={Colors.gray700}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.gray400}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={handleLogout}
          activeOpacity={0.6}
        >
          <View style={styles.menuRowLeft}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color={Colors.danger}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuLabel, { color: Colors.danger }]}>
              Odjava
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
  },
  email: {
    fontSize: 14,
    color: Colors.gray500,
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 12,
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray800,
  },
  divider: {
    height: 16,
  },
});
