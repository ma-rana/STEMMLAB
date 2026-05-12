// App.tsx
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

// Screens
import SoundPollutionScreen from './assets/src/screens/activities/SoundPollutionScreen.tsx';
import HandFanScreen from './assets/src/screens/activities/HandFanScreen.tsx';

// ─── Placeholder screens (other activities) ───────────────────────────────
const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f5f7' }}>
    <Text style={{ fontSize: 18, color: '#6b778c' }}>{name}</Text>
    <Text style={{ fontSize: 13, color: '#aaa', marginTop: 8 }}>Coming in Sprint 2/3</Text>
  </View>
);

// ─── Home / Activity List Screen ──────────────────────────────────────────
const activities = [
  { id: 1, title: 'Parachute Drop Challenge', emoji: '🪂', category: 'Engineering', screen: 'Parachute', ready: false },
  { id: 2, title: 'Sound Pollution Hunter', emoji: '🔊', category: 'Engineering', screen: 'SoundPollution', ready: true },
  { id: 3, title: 'Hand Fan Challenge', emoji: '🌬️', category: 'Engineering', screen: 'HandFan', ready: true },
  { id: 4, title: 'Earthquake-Resistant Structure', emoji: '🏗️', category: 'Engineering', screen: 'Earthquake', ready: false },
  { id: 5, title: 'Stretch Speed & Gracefulness', emoji: '🤸', category: 'Health', screen: 'Stretch', ready: false },
  { id: 6, title: 'Reaction Board Challenge', emoji: '⚡', category: 'Reaction', screen: 'Reaction', ready: false },
  { id: 7, title: 'Breathing Pace Trainer', emoji: '🫁', category: 'Health', screen: 'Breathing', ready: false },
];

function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>🧪 STEMM Lab</Text>
        <Text style={styles.homeSubtitle}>Real-World STEMM Activities</Text>
        <Text style={styles.homeTeam}>Team: Top Solves</Text>
      </View>

      <Text style={styles.sectionLabel}>⚙️ Engineering Challenges</Text>
      {activities.filter(a => a.category === 'Engineering').map(activity => (
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
              : <Text style={styles.comingSoonBadge}>🔒 Coming soon</Text>
            }
          </View>
          {activity.ready && <Text style={styles.arrow}>›</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionLabel}>🏥 Health & Medical Sciences</Text>
      {activities.filter(a => a.category !== 'Engineering').map(activity => (
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
              : <Text style={styles.comingSoonBadge}>🔒 Coming soon</Text>
            }
          </View>
          {activity.ready && <Text style={styles.arrow}>›</Text>}
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Leaderboard placeholder ───────────────────────────────────────────────
function LeaderboardScreen() {
  return <PlaceholderScreen name="🏆 Leaderboard — Coming Soon" />;
}

// ─── Profile placeholder ───────────────────────────────────────────────────
function ProfileScreen() {
  return <PlaceholderScreen name="👤 Profile — Coming Soon" />;
}

// ─── Stack Navigator (for activity screens) ───────────────────────────────
const Stack = createStackNavigator();

function ActivitiesStack() {
  // Hardcoded team info — replace with real team registration later
  const TEAM_ID = 'team_topsolves_001';
  const TEAM_NAME = 'Top Solves';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0052cc' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '🧪 STEMM Lab' }}
      />
      <Stack.Screen
        name="SoundPollution"
        options={{ title: 'Sound Pollution Hunter' }}
      >
        {() => <SoundPollutionScreen teamId={TEAM_ID} teamName={TEAM_NAME} />}
      </Stack.Screen>
      <Stack.Screen
        name="HandFan"
        options={{ title: 'Hand Fan Challenge' }}
      >
        {() => <HandFanScreen teamId={TEAM_ID} teamName={TEAM_NAME} />}
      </Stack.Screen>
      <Stack.Screen name="Parachute" options={{ title: 'Parachute Drop' }}>
        {() => <PlaceholderScreen name="🪂 Parachute Drop — Coming Soon" />}
      </Stack.Screen>
      <Stack.Screen name="Earthquake" options={{ title: 'Earthquake Structure' }}>
        {() => <PlaceholderScreen name="🏗️ Earthquake Structure — Coming Soon" />}
      </Stack.Screen>
      <Stack.Screen name="Stretch" options={{ title: 'Stretch Speed' }}>
        {() => <PlaceholderScreen name="🤸 Stretch Speed — Coming Soon" />}
      </Stack.Screen>
      <Stack.Screen name="Reaction" options={{ title: 'Reaction Board' }}>
        {() => <PlaceholderScreen name="⚡ Reaction Board — Coming Soon" />}
      </Stack.Screen>
      <Stack.Screen name="Breathing" options={{ title: 'Breathing Trainer' }}>
        {() => <PlaceholderScreen name="🫁 Breathing Trainer — Coming Soon" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#dfe1e6' },
          tabBarActiveTintColor: '#0052cc',
          tabBarInactiveTintColor: '#6b778c',
        }}
      >
        <Tab.Screen
          name="Activities"
          component={ActivitiesStack}
          options={{ tabBarLabel: 'Activities', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔬</Text> }}
        />
        <Tab.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{ tabBarLabel: 'Leaderboard', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏆</Text>, headerShown: true, headerStyle: { backgroundColor: '#0052cc' }, headerTintColor: '#fff', headerTitle: '🏆 Leaderboard' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>, headerShown: true, headerStyle: { backgroundColor: '#0052cc' }, headerTintColor: '#fff', headerTitle: '👤 Profile' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },

  homeHeader: {
    backgroundColor: '#0052cc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  homeTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  homeSubtitle: { fontSize: 15, color: '#deebff', marginTop: 4 },
  homeTeam: { fontSize: 13, color: '#b3d4ff', marginTop: 8 },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#42526e',
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  activityCardDisabled: { opacity: 0.5 },
  activityEmoji: { fontSize: 28 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#172b4d', marginBottom: 4 },
  readyBadge: { fontSize: 12, color: '#006644' },
  comingSoonBadge: { fontSize: 12, color: '#aaa' },
  arrow: { fontSize: 22, color: '#0052cc', fontWeight: 'bold' },
});
