import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useColors } from '@/hooks/useColors';

import LoginScreen from '@/screens/LoginScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import LeadsScreen from '@/screens/LeadsScreen';
import LeadDetailScreen from '@/screens/LeadDetailScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import SettingsScreen from '@/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LeadsStack() {
  const c = useColors();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: c.card }, headerTintColor: c.text }}>
      <Stack.Screen name="LeadsList" component={LeadsScreen} options={{ title: 'Leads' }} />
      <Stack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: 'Lead Detail' }} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const c = useColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: 'home',
            Leads: 'users',
            Notifications: 'bell',
            Settings: 'settings',
          };
          return <Feather name={icons[route.name] as never} size={size} color={color} />;
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.cardBorder },
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Leads" component={LeadsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigation() {
  const { user, isLoading, hydrate } = useAuthStore();
  const { dark, init: initTheme } = useThemeStore();
  const c = useColors();

  useEffect(() => {
    hydrate();
    initTheme();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const theme = dark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg, card: c.card } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg, card: c.card } };

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
