import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth-context';
import { Colors } from '@/constants/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: '600' },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="task-detail" options={{ headerShown: true, presentation: 'card' }} />
        <Stack.Screen name="automation" options={{ headerShown: true, presentation: 'card' }} />
        <Stack.Screen name="team" options={{ headerShown: true, presentation: 'card' }} />
        <Stack.Screen name="member-detail" options={{ headerShown: true, presentation: 'card' }} />
      </Stack>
    </AuthProvider>
  );
}
