// src/screens/auth/TeamRegistrationScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { saveTeamLocal } from '../../services/storage/sqliteService';
import { Team } from '../../types';

interface Props {
  onRegistered: (team: Team) => void;
}

const GRADE_LEVELS = ['Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10'];

function generateDiscriminator(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generateTeamId(): string {
  return `team_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export default function TeamRegistrationScreen({ onRegistered }: Props) {
  const [teamName, setTeamName] = useState('');
  const [memberNames, setMemberNames] = useState(['', '']);
  const [gradeLevel, setGradeLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addMember = () => {
    if (memberNames.length >= 6) {
      Alert.alert('Max members', 'Maximum 6 members per team.');
      return;
    }
    setMemberNames(prev => [...prev, '']);
  };

  const removeMember = (index: number) => {
    if (memberNames.length <= 1) {
      Alert.alert('Min members', 'At least 1 member required.');
      return;
    }
    setMemberNames(prev => prev.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, value: string) => {
    setMemberNames(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRegister = async () => {
    // Validation
    if (!teamName.trim()) {
      Alert.alert('Missing info', 'Please enter a team name.');
      return;
    }
    const validMembers = memberNames.filter(n => n.trim());
    if (validMembers.length === 0) {
      Alert.alert('Missing info', 'Please enter at least one member name.');
      return;
    }
    if (!gradeLevel) {
      Alert.alert('Missing info', 'Please select a grade level.');
      return;
    }

    setIsLoading(true);
    try {
      const team: Team = {
        id: generateTeamId(),
        teamName: teamName.trim(),
        memberNames: validMembers,
        gradeLevel,
        discriminator: generateDiscriminator(),
      };

      // Save locally to SQLite
      saveTeamLocal(team);

      onRegistered(team);
    } catch (error) {
      Alert.alert('Error', 'Failed to register team. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🧪</Text>
          <Text style={styles.title}>STEMM Lab</Text>
          <Text style={styles.subtitle}>Register Your Team</Text>
        </View>

        {/* Team Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Team Name</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="e.g. Top Solves"
            placeholderTextColor="#aaa"
            maxLength={30}
          />
        </View>

        {/* Member Names */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Team Members ({memberNames.length}/6)
          </Text>
          {memberNames.map((name, index) => (
            <View key={index} style={styles.memberRow}>
              <View style={styles.memberNumberBadge}>
                <Text style={styles.memberNumber}>{index + 1}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.memberInput]}
                value={name}
                onChangeText={v => updateMember(index, v)}
                placeholder={`Member ${index + 1} first name`}
                placeholderTextColor="#aaa"
                maxLength={20}
              />
              {memberNames.length > 1 && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeMember(index)}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addMemberBtn} onPress={addMember}>
            <Text style={styles.addMemberText}>+ Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Grade Level */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Grade / Year Level</Text>
          <View style={styles.gradeGrid}>
            {GRADE_LEVELS.map(grade => (
              <TouchableOpacity
                key={grade}
                style={[
                  styles.gradeBtn,
                  gradeLevel === grade && styles.gradeBtnActive,
                ]}
                onPress={() => setGradeLevel(grade)}
              >
                <Text
                  style={[
                    styles.gradeBtnText,
                    gradeLevel === grade && styles.gradeBtnTextActive,
                  ]}
                >
                  {grade}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Your team will be assigned a unique Team ID automatically.
          </Text>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerBtnText}>🚀 Start Playing!</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 20 },

  header: { alignItems: 'center', marginBottom: 24, paddingTop: 20 },
  logo: { fontSize: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#172b4d', marginTop: 8 },
  subtitle: { fontSize: 16, color: '#6b778c', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172b4d',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0052cc',
    paddingLeft: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#dfe1e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#172b4d',
    backgroundColor: '#fafbfc',
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  memberNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0052cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberNumber: { color: '#fff', fontWeight: '700', fontSize: 13 },
  memberInput: { flex: 1, marginBottom: 0 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffebe6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#de350b', fontWeight: '700', fontSize: 13 },
  addMemberBtn: {
    borderWidth: 1,
    borderColor: '#0052cc',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  addMemberText: { color: '#0052cc', fontWeight: '600', fontSize: 14 },

  gradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfe1e6',
    backgroundColor: '#fafbfc',
  },
  gradeBtnActive: { backgroundColor: '#0052cc', borderColor: '#0052cc' },
  gradeBtnText: { fontSize: 14, color: '#42526e', fontWeight: '600' },
  gradeBtnTextActive: { color: '#fff' },

  infoBox: {
    backgroundColor: '#deebff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { fontSize: 13, color: '#0747a6' },

  registerBtn: {
    backgroundColor: '#0052cc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  registerBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
