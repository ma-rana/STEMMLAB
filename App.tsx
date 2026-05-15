// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';

// Screens
import TeamRegistrationScreen from './assets/src/screens/auth/TeamRegistrationScreen';
import SoundPollutionScreen from './assets/src/screens/activities/SoundPollutionScreen';
import HandFanScreen from './assets/src/screens/activities/HandFanScreen';
import EarthquakeScreen from './assets/src/screens/activities/EarthquakeScreen';
import StretchScreen from './assets/src/screens/activities/StretchScreen';

// Types
import { Team } from './assets/src/types';

// ─── Placeholder ───────────────────────────────────────────────────────────
const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f5f7' }}>
    <Text style={{ fontSize: 18, color: '#6b778c' }}>{name}</Text>
    <Text style={{ fontSize: 13, color: '#aaa', marginTop: 8 }}>Coming in Sprint 3</Text>
  </View>
);

// ─── Activity list ─────────────────────────────────────────────────────────
const activities = [
  { id: 1, title: 'Parachute Drop Challenge',      emoji: '🪂', category: 'Engineering', screen: 'Parachute',      ready: false },
  { id: 2, title: 'Sound Pollution Hunter',         emoji: '🔊', category: 'Engineering', screen: 'SoundPollution', ready: true  },
  { id: 3, title: 'Hand Fan Challenge',             emoji: '🌬️', category: 'Engineering', screen: 'HandFan',        ready: true  },
  { id: 4, title: 'Earthquake-Resistant Structure', emoji: '🏗️', category: 'Engineering', screen: 'Earthquake',     ready: true  },
  { id: 5, title: 'Stretch Speed & Gracefulness',  emoji: '🤸', category: 'Health',       screen: 'Stretch',        ready: true  },
  { id: 6, title: 'Reaction Board Challenge',       emoji: '⚡', category: 'Health',       screen: 'Reaction',       ready: false },
  { id: 7, title: 'Breathing Pace Trainer',         emoji: '🫁', category: 'Health',       screen: 'Breathing',      ready: false },
];

// ─── Home Screen ───────────────────────────────────────────────────────────
function HomeScreen({ navigation, team }: { navigation: any; team: Team }) {
  const engineering = activities.filter(a => a.category === 'Engineering');
  const health = activities.filter(a => a.category === 'Health');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.teamBanner}>
        <View>
          <Text style={styles.teamBannerName}>👋 {team.teamName}</Text>
          <Text style={styles.teamBannerMeta}>
            {team.memberNames.join(', ')} · {team.gradeLevel}
          </Text>
        </View>
        <View style={styles.teamIdBadge}>
          <Text style={styles.teamIdText}>#{team.discriminator}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>⚙️ Engineering Challenges</Text>
      {engineering.map(activity => (
        <TouchableOpacity
          key={activity.id}
          style={[styles.activityCard, !activity.ready && styles.activityCardDisabled]}
          onPress={() => activity.ready && navigation.navigate(activity.screen)}
          disabled={!activity.ready}
        >
          <Text style={styles.activityEmoji}>{activity.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.activityTitle, !activity.ready && { color: '#aaa' }]}>
              Activity {activity.id}: {activity.title}
            </Text>
            {activity.ready
              ? <Text style={styles.readyBadge}>✅ Ready to play</Text>
              : <Text style={styles.comingSoonBadge}>🔒 Coming in Sprint 3</Text>
            }
          </View>
          {activity.ready && <Text style={styles.arrow}>›</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionLabel}>🏥 Health & Medical Sciences</Text>
      {health.map(activity => (
        <TouchableOpacity
          key={activity.id}
          style={[styles.activityCard, !activity.ready && styles.activityCardDisabled]}
          onPress={() => activity.ready && navigation.navigate(activity.screen)}
          disabled={!activity.ready}
        >
          <Text style={styles.activityEmoji}>{activity.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.activityTitle, !activity.ready && { color: '#aaa' }]}>
              Activity {activity.id}: {activity.title}
            </Text>
            {activity.ready
              ? <Text style={styles.readyBadge}>✅ Ready to play</Text>
              : <Text style={styles.comingSoonBadge}>🔒 Coming in Sprint 3</Text>
            }
          </View>
          {activity.ready && <Text style={styles.arrow}>›</Text>}
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Profile Screen ────────────────────────────────────────────────────────
function ProfileScreen({ team }: { team: Team }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.profileHeader}>
        <Text style={styles.profileEmoji}>🧪</Text>
        <Text style={styles.profileTeamName}>{team.teamName}</Text>
        <View style={styles.profileDiscriminator}>
          <Text style={styles.profileDiscriminatorText}>Team #{team.discriminator}</Text>
        </View>
      </View>
      <View style={styles.profileCard}>
        <Text style={styles.profileCardTitle}>Team Members</Text>
        {team.memberNames.map((name, i) => (
          <View key={i} style={styles.profileMemberRow}>
            <View style={styles.profileMemberBadge}>
              <Text style={styles.profileMemberNumber}>{i + 1}</Text>
            </View>
            <Text style={styles.profileMemberName}>{name}</Text>
          </View>
        ))}
      </View>
      <View style={styles.profileCard}>
        <Text style={styles.profileCardTitle}>Details</Text>
        <View style={styles.profileDetailRow}>
          <Text style={styles.profileDetailLabel}>Grade Level</Text>
          <Text style={styles.profileDetailValue}>{team.gradeLevel}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Leaderboard ───────────────────────────────────────────────────────────
function LeaderboardScreen() {
  return <PlaceholderScreen name="🏆 Leaderboard — Coming in Sprint 3" />;
}

// ─── Stack Navigator ───────────────────────────────────────────────────────
const Stack = createStackNavigator();

function ActivitiesStack({ team }: { team: Team }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0052cc' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Home" options={{ title: '🧪 STEMM Lab' }}>
        {({ navigation }) => <HomeScreen navigation={navigation} team={team} />}
      </Stack.Screen>
      <Stack.Screen name="SoundPollution" options={{ title: 'Sound Pollution Hunter' }}>
        {() => <SoundPollutionScreen teamId={team.id} teamName={team.teamName} />}
      </Stack.Screen>
      <Stack.Screen name="HandFan" options={{ title: 'Hand Fan Challenge' }}>
        {() => <HandFanScreen teamId={team.id} teamName={team.teamName} />}
      </Stack.Screen>
      <Stack.Screen name="Earthquake" options={{ title: 'Earthquake-Resistant Structure' }}>
        {() => <EarthquakeScreen teamId={team.id} teamName={team.teamName} />}
      </Stack.Screen>
      <Stack.Screen name="Stretch" options={{ title: 'Stretch Speed & Gracefulness' }}>
        {() => (
          <StretchScreen
            teamId={team.id}
            teamName={team.teamName}
            memberNames={team.memberNames}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Parachute" options={{ title: 'Parachute Drop' }}>
        {() => <PlaceholderScreen name="🪂 Coming in Sprint 3" />}
      </Stack.Screen>
      <Stack.Screen name="Reaction" options={{ title: 'Reaction Board' }}>
        {() => <PlaceholderScreen name="⚡ Coming in Sprint 3" />}
      </Stack.Screen>
      <Stack.Screen name="Breathing" options={{ title: 'Breathing Trainer' }}>
        {() => <PlaceholderScreen name="🫁 Coming in Sprint 3" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Bottom Tab ────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

function MainApp({ team }: { team: Team }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#dfe1e6' },
        tabBarActiveTintColor: '#0052cc',
        tabBarInactiveTintColor: '#6b778c',
      }}
    >
      <Tab.Screen
        name="ActivitiesTab"
        options={{
          tabBarLabel: 'Activities',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔬</Text>,
        }}
      >
        {() => <ActivitiesStack team={team} />}
      </Tab.Screen>
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏆</Text>,
          headerShown: true,
          headerStyle: { backgroundColor: '#0052cc' },
          headerTintColor: '#fff',
          headerTitle: '🏆 Leaderboard',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
          headerShown: true,
          headerStyle: { backgroundColor: '#0052cc' },
          headerTintColor: '#fff',
          headerTitle: '👤 Profile',
        }}
      >
        {() => <ProfileScreen team={team} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ✅ SQLite를 완전히 제거하고 나중에 연결
    // 지금은 앱이 뜨는지 확인하는 게 우선
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // 500ms 후 무조건 로딩 해제

    // SQLite + 기타 서비스는 백그라운드에서 처리
    initServices();

    return () => clearTimeout(timer);
  }, []);

  const initServices = async () => {
    try {
      // SQLite 초기화
      const { initDatabase, getTeamLocal } = await import('./src/services/storage/sqliteService');
      initDatabase();
      const savedTeam = getTeamLocal();
      if (savedTeam) {
        setTeam(savedTeam);
      }
    } catch (e) {
      console.warn('SQLite init failed, continuing without local storage:', e);
    }

    // 알림 + 백그라운드 싱크 (실패해도 앱은 계속 실행)
    try {
      const { requestNotificationPermission } = await import('./src/services/notifications/notificationService');
      await requestNotificationPermission();
    } catch (e) {
      console.warn('Notification permission failed:', e);
    }

    try {
      const { registerBackgroundSync } = await import('./src/services/background/backgroundSync');
      await registerBackgroundSync();
    } catch (e) {
      console.warn('Background sync registration failed:', e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashEmoji}>🧪</Text>
        <Text style={styles.splashTitle}>STEMM Lab</Text>
        <ActivityIndicator size="large" color="#0052cc" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!team) {
    return <TeamRegistrationScreen onRegistered={(newTeam) => setTeam(newTeam)} />;
  }

  return (
    <NavigationContainer>
      <MainApp team={team} />
    </NavigationContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },

  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f5f7',
  },
  splashEmoji: { fontSize: 72 },
  splashTitle: { fontSize: 28, fontWeight: 'bold', color: '#172b4d', marginTop: 12 },

  teamBanner: {
    backgroundColor: '#0052cc', borderRadius: 12, padding: 16, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  teamBannerName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  teamBannerMeta: { fontSize: 12, color: '#b3d4ff', marginTop: 4 },
  teamIdBadge: { backgroundColor: '#ffffff30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  teamIdText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#42526e',
    marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  activityCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 12,
  },
  activityCardDisabled: { opacity: 0.5 },
  activityEmoji: { fontSize: 28 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#172b4d', marginBottom: 4 },
  readyBadge: { fontSize: 12, color: '#006644' },
  comingSoonBadge: { fontSize: 12, color: '#aaa' },
  arrow: { fontSize: 22, color: '#0052cc', fontWeight: 'bold' },

  profileHeader: { alignItems: 'center', marginBottom: 24, paddingTop: 10 },
  profileEmoji: { fontSize: 56 },
  profileTeamName: { fontSize: 26, fontWeight: 'bold', color: '#172b4d', marginTop: 8 },
  profileDiscriminator: { backgroundColor: '#deebff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
  profileDiscriminatorText: { color: '#0747a6', fontWeight: '700', fontSize: 13 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  profileCardTitle: { fontSize: 14, fontWeight: '700', color: '#172b4d', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#0052cc', paddingLeft: 8 },
  profileMemberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  profileMemberBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0052cc', alignItems: 'center', justifyContent: 'center' },
  profileMemberNumber: { color: '#fff', fontWeight: '700', fontSize: 12 },
  profileMemberName: { fontSize: 14, color: '#172b4d' },
  profileDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f4f5f7' },
  profileDetailLabel: { fontSize: 13, color: '#6b778c' },
  profileDetailValue: { fontSize: 13, color: '#172b4d', fontWeight: '600' },
});
