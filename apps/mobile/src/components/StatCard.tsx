import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: keyof typeof colorMap;
}

const colorMap = {
  primary: { bg: Colors.primary + '15', text: Colors.primary },
  success: { bg: Colors.successLight, text: Colors.success },
  warning: { bg: Colors.warningLight, text: Colors.warning },
  danger: { bg: Colors.dangerLight, text: Colors.danger },
};

export function StatCard({ label, value, color = 'primary' }: StatCardProps) {
  const c = colorMap[color];

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
    minWidth: '45%',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray500,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gray900,
    marginTop: 6,
  },
  badge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
