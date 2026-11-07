import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

// To add a tab: create src/app/(tabs)/space.js and add a <Tabs.Screen name="space" ... />.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.paper },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="partly-sunny-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
