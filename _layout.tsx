import Tabs from 'expo-router/js-tabs';
import { Text } from 'react-native';

import { colors } from '@/lib/theme';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Carte', tabBarIcon: icon('🗺️') }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: icon('📊') }} />
      <Tabs.Screen name="friends" options={{ title: 'Amis', tabBarIcon: icon('👯') }} />
      <Tabs.Screen name="leagues" options={{ title: 'Ligues', tabBarIcon: icon('🏆') }} />
      <Tabs.Screen name="profile" options={{ title: 'Moi', tabBarIcon: icon('🙂') }} />
    </Tabs>
  );
}
