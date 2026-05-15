// src/screens/activities/StretchScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useGyroscope } from '../../hooks/useGyroscope';
import { saveStretchResult } from '../../services/firebase/activityService';
import { saveStretchAttemptLocal } from '../../services/storage/sqliteService';
import { StretchAttempt, StretchActivityResult } from '../../types';

// ─── Smoothness indicator ──────────────────────────────────────────────────
function getSmoothnessLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent 🟢', color: '#27ae60' };
  if (score >= 60) return { label: 'Good 🟡', color: '#f1c40f' };
  if (score >= 40) return { label: 'Fair 🟠', color: '#e67e22' };
  return { label: 'Needs practice 🔴', color: '#e74c3c' };
}

// ─── Smoothness gauge ──────────────────────────────────────────────────────
const SmoothnessGauge: React.FC<{ smoothness: number; rotationRate: number }> = ({
  smoothness, rotationRate,
}) => {
  const sm = getSmoothnessLabel(smoothness);
  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeRow}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.gaugeTitle}>Smoothness</Text>
          <Text style={[styles.gaugeValue, { color: sm.color }]}>{smoothness}</Text>
          <Text style={styles.gaugeUnit}>/ 100</Text>
          <View style={styles.gaugeBar}>
            <View style={[styles.gaugeFill, { width: `${smoothness}%` as any, backgroundColor: sm.color }]} />
          </View>
          <Text style={[styles.gaugeStatus, { color: sm.color }]}>{sm.label}</Text>
        </View>
        <View style={styles.gaugeDivider} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.gaugeTitle}>Rotation Rate</Text>
          <Text style={[styles.gaugeValue, { color: '#0052cc' }]}>
            {rotationRate.toFixed(2)}
          </Text>
          <Text style={styles.gaugeUnit}>rad/s</Text>
          <View style={styles.gaugeBar}>
            <View style={[styles.gaugeFill, { width: `${Math.min((rotationRate / 5) * 100, 100)}%` as any, backgroundColor: '#0052cc' }]} />
          </View>
          <Text style={styles.gaugeStatus}>
            {rotationRate < 0.5 ? 'Slow & controlled' : rotationRate < 2 ? 'Moderate speed' : 'Fast movement'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Movement types (from spec) ────────────────────────────────────────────
const MOVEMENTS = [
  { id: '1', label: 'Movement 1 – Arm raise (slow)', emoji: '🙋' },
  { id: '2', label: 'Movement 2 – Side stretch', emoji: '🤸' },
  { id: '3', label: 'Movement 3 – Torso rotation', emoji: '🔄' },
];

// ─── Main Screen ───────────────────────────────────────────────────────────
interface Props { teamId: string; teamName: string; memberNames: string[] }
const MAX_ATTEMPTS_PER_MEMBER = 3;

export default function StretchScreen({ teamId, teamName, memberNames }: Props) {
  const { rotationRate, smoothness, isActive, hasPermission, start, stop } = useGyroscope(100);

  const [attempts, setAttempts] = useState<StretchAttempt[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'perform' | 'results'>('perform');
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);

  const [form, setForm] = useState({
    movementId: '1',
    predictedVibration: '',
    notes: '',
  });

  // Timer for duration tracking
  const startTimeRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState(0);

  // Smoothness samples during a recording session
  const smoothnessSamplesRef = useRef<number[]>([]);
  const peakRotationRef = useRef(0);

  const updateForm = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const currentMember = memberNames[currentMemberIndex] ?? `Member ${currentMemberIndex + 1}`;

  const handleStartRecording = () => {
    if (!form.predictedVibration.trim()) {
      Alert.alert('Missing info', 'Enter your predicted vibration first.');
      return;
    }
    smoothnessSamplesRef.current = [];
    peakRotationRef.current = 0;
    startTimeRef.current = Date.now();
    setIsRecording(true);
    start();
  };

  // Collect samples while recording
  React.useEffect(() => {
    if (isRecording && isActive) {
      smoothnessSamplesRef.current.push(smoothness);
      if (rotationRate > peakRotationRef.current) peakRotationRef.current = rotationRate;
    }
  }, [smoothness, rotationRate, isRecording, isActive]);

  const handleStopRecording = useCallback(() => {
    stop();
    const duration = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0;
    setRecordedDuration(duration);
    setIsRecording(false);
  }, [stop]);

  const handleSaveAttempt = useCallback(() => {
    if (!isRecording && recordedDuration === 0) {
      Alert.alert('No recording', 'Please record a movement first.');
      return;
    }

    const samples = smoothnessSamplesRef.current;
    const avgSmoothness = samples.length > 0
      ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
      : smoothness;

    const selectedMovement = MOVEMENTS.find(m => m.id === form.movementId);

    const newAttempt: StretchAttempt = {
      id: Date.now().toString(),
      memberName: currentMember,
      movementType: selectedMovement?.label ?? 'Movement',
      durationSeconds: recordedDuration,
      peakRotationRate: Math.round(peakRotationRef.current * 1000) / 1000,
      averageSmoothness: avgSmoothness,
      predictedVibration: form.predictedVibration.trim(),
      notes: form.notes.trim(),
      timestamp: new Date(),
    };

    saveStretchAttemptLocal(teamId, newAttempt);
    setAttempts(prev => [...prev, newAttempt]);
    setRecordedDuration(0);
    smoothnessSamplesRef.current = [];
    peakRotationRef.current = 0;
    setForm({ movementId: '1', predictedVibration: '', notes: '' });
    setActiveTab('results');
    Alert.alert('✅ Attempt Saved', `Smoothness: ${avgSmoothness}/100 · Duration: ${newAttempt.durationSeconds}s`);
  }, [isRecording, recordedDuration, smoothness, form, currentMember, teamId]);

  const handleSubmit = useCallback(async () => {
    if (attempts.length === 0) {
      Alert.alert('No data', 'Record at least one attempt before submitting.');
      return;
    }
    setIsSaving(true);
    try {
      const result: StretchActivityResult = { teamId, teamName, attempts, createdAt: new Date() };
      await saveStretchResult(result);
      setSubmitted(true);
      Alert.alert('✅ Submitted!', 'Results saved to cloud!');
    } catch {
      Alert.alert('Offline', 'Saved locally. Will sync when online.');
      setSubmitted(true);
    } finally {
      setIsSaving(false);
    }
  }, [attempts, teamId, teamName]);

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Sensor permission required.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f5f7' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🤸 Activity 5 – Stretch Speed & Gracefulness</Text>
        <Text style={styles.headerSub}>Human Performance Lab</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['perform', 'results'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'perform' ? '🤸 Perform' : `📊 Results (${attempts.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab: Perform ── */}
      {activeTab === 'perform' && (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Member selector */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Current Member</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.memberRow}>
                {memberNames.map((name, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.memberBtn, currentMemberIndex === idx && styles.memberBtnActive]}
                    onPress={() => setCurrentMemberIndex(idx)}
                  >
                    <Text style={[styles.memberBtnText, currentMemberIndex === idx && styles.memberBtnTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Instructions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Instructions</Text>
            {[
              '1. Hold the phone firmly in one hand.',
              '2. Select the movement type below.',
              '3. Enter your predicted vibration level.',
              '4. Tap "Start Recording" and perform the movement.',
              '5. Tap "Stop Recording" when done.',
              '6. Review your smoothness score and save.',
            ].map((step, i) => (
              <Text key={i} style={styles.instructionText}>{step}</Text>
            ))}
          </View>

          {/* Live sensor display */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📡 Live Sensor – {currentMember}</Text>
            <SmoothnessGauge smoothness={smoothness} rotationRate={rotationRate} />
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <Text style={styles.recordingText}>
                  🔴 Recording... {Math.round((Date.now() - (startTimeRef.current ?? Date.now())) / 1000)}s
                </Text>
              </View>
            )}
            {recordedDuration > 0 && !isRecording && (
              <View style={styles.recordedInfo}>
                <Text style={styles.recordedText}>
                  ✅ Recorded {recordedDuration}s · Peak: {peakRotationRef.current.toFixed(2)} rad/s
                </Text>
              </View>
            )}
          </View>

          {/* Movement + form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Movement</Text>
            {MOVEMENTS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.movementBtn, form.movementId === m.id && styles.movementBtnActive]}
                onPress={() => updateForm('movementId', m.id)}
              >
                <Text style={styles.movementEmoji}>{m.emoji}</Text>
                <Text style={[styles.movementLabel, form.movementId === m.id && styles.movementLabelActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Predicted Vibration (e.g. +/- 1cm)
            </Text>
            <TextInput
              style={styles.input}
              value={form.predictedVibration}
              onChangeText={v => updateForm('predictedVibration', v)}
              placeholder="e.g. +/- 1cm"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.notes}
              onChangeText={v => updateForm('notes', v)}
              placeholder="Any observations..."
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={2}
            />

            <View style={styles.recordBtnRow}>
              {!isRecording
                ? <TouchableOpacity
                    style={[styles.button, styles.buttonStart, { flex: 1 }]}
                    onPress={handleStartRecording}
                    disabled={isRecording}
                  >
                    <Text style={styles.buttonText}>🔴 Start Recording</Text>
                  </TouchableOpacity>
                : <TouchableOpacity
                    style={[styles.button, styles.buttonStop, { flex: 1 }]}
                    onPress={handleStopRecording}
                  >
                    <Text style={styles.buttonText}>⏹ Stop Recording</Text>
                  </TouchableOpacity>
              }
            </View>

            {recordedDuration > 0 && !isRecording && (
              <TouchableOpacity
                style={[styles.button, styles.buttonCapture]}
                onPress={handleSaveAttempt}
              >
                <Text style={styles.buttonText}>💾 Save Attempt</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Tab: Results ── */}
      {activeTab === 'results' && (
        <ScrollView contentContainerStyle={styles.content}>
          {attempts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No attempts yet.</Text>
              <Text style={styles.emptySubtext}>Go to Perform tab to record.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Results ({attempts.length})</Text>

              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 2 }]}>Member / Movement</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Smooth</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Peak</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Dur.</Text>
              </View>

              {attempts.map((a, idx) => {
                const sm = getSmoothnessLabel(a.averageSmoothness);
                return (
                  <View key={a.id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.tdText}>{a.memberName}</Text>
                      <Text style={styles.tdSubtext}>{a.movementType}</Text>
                      <Text style={styles.tdNote}>Predicted: {a.predictedVibration}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tdText, { color: sm.color, fontWeight: 'bold' }]}>
                        {a.averageSmoothness}
                      </Text>
                      <Text style={[styles.tdSubtext, { color: sm.color }]}>{sm.label}</Text>
                    </View>
                    <Text style={[styles.tdText, { flex: 1 }]}>
                      {a.peakRotationRate.toFixed(2)} r/s
                    </Text>
                    <Text style={[styles.tdText, { flex: 1 }]}>
                      {a.durationSeconds}s
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {!submitted
            ? <TouchableOpacity
                style={[styles.button, styles.buttonSubmit]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                {isSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>✅ Submit to Cloud</Text>
                }
              </TouchableOpacity>
            : <View style={styles.successBox}>
                <Text style={styles.successText}>✅ Results submitted!</Text>
              </View>
          }
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#e74c3c', fontSize: 16, textAlign: 'center' },

  header: { backgroundColor: '#006644', padding: 16 },
  headerSub: { fontSize: 13, color: '#c1f0d8', marginTop: 4 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dfe1e6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#006644' },
  tabText: { fontSize: 13, color: '#6b778c', fontWeight: '600' },
  tabTextActive: { color: '#006644' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#172b4d', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#006644', paddingLeft: 8 },

  instructionText: { fontSize: 13, color: '#42526e', marginBottom: 6, lineHeight: 20 },

  gaugeContainer: { marginBottom: 12 },
  gaugeRow: { flexDirection: 'row', gap: 12 },
  gaugeTitle: { fontSize: 12, color: '#6b778c', fontWeight: '600', marginBottom: 4 },
  gaugeValue: { fontSize: 36, fontWeight: 'bold' },
  gaugeUnit: { fontSize: 12, color: '#6b778c', marginBottom: 4 },
  gaugeBar: { width: '100%', height: 12, backgroundColor: '#dfe1e6', borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  gaugeFill: { height: '100%', borderRadius: 6 },
  gaugeStatus: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  gaugeDivider: { width: 1, backgroundColor: '#dfe1e6' },

  recordingIndicator: { backgroundColor: '#ffebe6', borderRadius: 8, padding: 10, alignItems: 'center' },
  recordingText: { color: '#de350b', fontWeight: '700', fontSize: 14 },
  recordedInfo: { backgroundColor: '#e3fcef', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  recordedText: { color: '#006644', fontWeight: '600', fontSize: 13 },

  memberRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  memberBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#dfe1e6', backgroundColor: '#fafbfc' },
  memberBtnActive: { backgroundColor: '#006644', borderColor: '#006644' },
  memberBtnText: { fontSize: 13, color: '#42526e', fontWeight: '600' },
  memberBtnTextActive: { color: '#fff' },

  movementBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#dfe1e6', marginBottom: 8, backgroundColor: '#fafbfc' },
  movementBtnActive: { backgroundColor: '#006644', borderColor: '#006644' },
  movementEmoji: { fontSize: 22 },
  movementLabel: { fontSize: 13, color: '#42526e', fontWeight: '600', flex: 1 },
  movementLabelActive: { color: '#fff' },

  inputLabel: { fontSize: 13, color: '#42526e', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#dfe1e6', borderRadius: 8, padding: 10, fontSize: 14, color: '#172b4d', marginBottom: 10, backgroundColor: '#fafbfc' },
  inputMultiline: { height: 70, textAlignVertical: 'top' },

  recordBtnRow: { flexDirection: 'row', gap: 8 },
  button: { borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 4 },
  buttonStart: { backgroundColor: '#006644' },
  buttonStop: { backgroundColor: '#de350b' },
  buttonCapture: { backgroundColor: '#0052cc', marginTop: 8 },
  buttonSubmit: { backgroundColor: '#6554c0', marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tableHeader: { flexDirection: 'row', backgroundColor: '#006644', borderRadius: 6, padding: 8, marginBottom: 4 },
  thCell: { fontSize: 11, color: '#fff', fontWeight: '700' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f4f5f7', alignItems: 'center' },
  tableRowEven: { backgroundColor: '#fafbfc' },
  tdText: { fontSize: 12, color: '#172b4d' },
  tdSubtext: { fontSize: 10, color: '#6b778c', marginTop: 2 },
  tdNote: { fontSize: 10, color: '#0052cc', marginTop: 2, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6b778c', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#aaa', marginTop: 4 },

  successBox: { backgroundColor: '#e3fcef', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 8 },
  successText: { color: '#006644', fontWeight: '700', fontSize: 15 },
});
