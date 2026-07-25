import { Tabs } from 'expo-router'
import { Trophy, Users, Dumbbell, Swords, Settings } from 'lucide-react-native'
import { useTheme } from '@/lib/theme-context'
import { useI18n } from '@/lib/i18n/context'

export default function TabsLayout() {
  const { t } = useI18n()
  const theme = useTheme()
  const active = theme.isDark ? theme.accent : theme.text
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: theme.textMute,
        tabBarStyle: {
          backgroundColor: theme.nav,
          borderTopColor: theme.line,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: t.matchesLabel, tabBarIcon: ({ color }) => <Trophy color={color} size={22} /> }} />
      <Tabs.Screen name="players" options={{ title: t.playersLabel, tabBarIcon: ({ color }) => <Users color={color} size={22} /> }} />
      <Tabs.Screen name="training" options={{ title: t.trainingLabel, tabBarIcon: ({ color }) => <Dumbbell color={color} size={22} /> }} />
      <Tabs.Screen name="community" options={{ title: t.navMatching, tabBarIcon: ({ color }) => <Swords color={color} size={22} /> }} />
      <Tabs.Screen name="team" options={{ title: t.teamManagement, tabBarIcon: ({ color }) => <Settings color={color} size={22} /> }} />
    </Tabs>
  )
}
