import 'expo-router/entry';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigation from './src/navigation';
import { useNotifications } from './src/hooks/useNotifications';
import { useAuthStore } from './src/store/auth';

function AppContent() {
  const { user } = useAuthStore();
  useNotifications(user?.id);
  return <RootNavigation />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
