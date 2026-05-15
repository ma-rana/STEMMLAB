// src/screens/activities/EarthquakeScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { useAccelerometer } from '../../hooks/useAccelerometer';
import { saveEarthquakeResult } from '../../services/firebase/activityService';
import { saveEarthquakeDesignLocal } from '../../services/storage/sqliteService';
import {
  scheduleEngineeringTimer,
  cancelAllNotifications,
} from '../../services/notifications/notificationService';
import { EarthquakeDesign, EarthquakeActivityResult } from '../../types';

// ─── Vibration intensity label ─────────────────────────────────────────────
function getVibrationLabel(magnitude: number): { label: string; color: string } {
  if (magnitude < 0.05) return { label: 'Stable 🟢', color: '#27ae60' };
  if (magnitude < 0.2)  return { label: 'Minor vibration 🟡', color: '#f1c40f' };
  if (magnitude < 0.5)  return { label: 'Moderate 🟠', color: '#e67e22' };
  if (magnitude < 1.0)  return { label: 'Strong 🔴', color: '#e74c3c' };
  return { label: 'Very strong 🚨', color: '#c0392b' };
}

// ─── Animated vibration bar ────────────────────────────────────────────────
const VibrationMeter: React.FC<{ magnitude: number; peak: number }> = ({ magnitude, peak }) => {
  const vib = getVibrationLabel(magnitude);
  const percentage = Math.min((magnitude / 2) * 100, 100);
  const peakPercentage = Math.min((peak / 2) * 100, 100);

  return (
    <View style={styles.meterContainer}>
      <View style={styles.meterRow}>
        <Text style={styles.meterLabel}>Live</Text>
        <Text style={[styles.meterValue, { color: vib.color }]}>{magnitude.toFixed(3)} g</Text>
      </View>
      <View style={styles.meterBar}>
        <View style={[styles.meterFill, { width: `${percentage}%` as any, backgroundColor: vib.color }]} />
      </View>
      <Text style={[styles.meterStatus, { color: vib.color }]}>{vib.label}</Text>

      <View style={[styles.meterRow, { marginTop: 8 }]}>
        <Text style={styles.meterLabel}>Peak this session</Text>
        <Text style={[styles.meterValue, { color: '#e74c3c' }]}>{peak.toFixed(3)} g</Text>
      </View>
      <View style={styles.meterBar}>
        <View style={[styles.meterFill, { width: `${peakPercentage}%` as any, backgroundColor: '#e74c3c' }]} />
      </View>
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────
interface Props { teamId: string; teamName: string; }
const MAX_DESIGNS = 3;

export default function EarthquakeScreen({ teamId, teamName }: Props) {
  const { magnitude, peakMagnitude, isActive, hasPermission, start, stop, resetPeak } =
    useAccelerometer(60); // 60Hz as per spec

  const [designs, setDesigns] = useState<EarthquakeDesign[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'test' | 'results'>('test');

  const [form, setForm] = useState({
    designName: '',
    foldCount: '',
    pillarCount: '',
    predictedMovement: '',
    notes: '',
  });

  const updateForm = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleStartTimer = async () => {
    await scheduleEngineeringTimer('Earthquake Structure');
    setTimerStarted(true);
    Alert.alert('⏱️ Timer Started', 'You will be notified at 15 and 20 minutes.');
  };

  const handleStartSensor = () => {
    resetPeak();
    start();
  };

  const handleCaptureDesign = useCallback(() => {
    if (!form.designName.trim()) {
      Alert.alert('Missing info', 'Please enter a design name.');
      return;
    }
    if (!form.foldCount || !form.pillarCount) {
      Alert.alert('Missing info', 'Please enter fold and pillar count.');
      return;
    }
    if (!form.predictedMovement.trim()) {
      Alert.alert('Missing info', 'Please enter your predicted movement.');
      return;
    }
    if (designs.length >= MAX_DESIGNS) {
      Alert.alert('Max reached', `Maximum ${MAX_DESIGNS} designs.`);
      return;
    }

    const newDesign: EarthquakeDesign = {
      id: Date.now().toString(),
      designName: form.designName.trim(),
      foldCount: Number(form.foldCount),
      pillarCount: Number(form.pillarCount),
      predictedMovement: form.predictedMovement.trim(),
      peakMagnitude: isActive ? peakMagnitude : null,
      notes: form.notes.trim(),
      wasRight: null,
    };

    saveEarthquakeDesignLocal(teamId, newDesign);
    setDesigns(prev => [...prev, newDesign]);
    stop();
    resetPeak();
    setForm({ designName: '', foldCount: '', pillarCount: '', predictedMovement: '', notes: '' });
    setActiveTab('results');
    Alert.alert('✅ Design Saved', `Peak vibration: ${newDesign.peakMagnitude?.toFixed(3) ?? 'N/A'} g`);
  }, [form, designs.length, isActive, peakMagnitude, teamId]);

  const toggleWasRight = useCallback((id: string, value: boolean) => {
    setDesigns(prev => prev.map(d => d.id === id ? { ...d, wasRight: value } : d));
  }, []);

  const deleteDesign = useCallback((id: string) => {
    setDesigns(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (designs.length === 0) {
      Alert.alert('No data', 'Add at least one design before submitting.');
      return;
    }
    setIsSaving(true);
    try {
      const result: EarthquakeActivityResult = { teamId, teamName, designs, createdAt: new Date() };
      await saveEarthquakeResult(result);
      await cancelAllNotifications();
      setSubmitted(true);
      Alert.alert('✅ Submitted!', 'Results saved to cloud!');
    } catch {
      Alert.alert('Offline', 'Saved locally. Will sync when online.');
      setSubmitted(true);
    } finally {
      setIsSaving(false);
    }
  }, [designs, teamId, teamName]);

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
        <Text style={styles.title}>🏗️ Activity 4 – Earthquake-Resistant Structure</Text>
        <View style={styles.headerRow}>
          {!timerStarted
            ? <TouchableOpacity style={styles.timerBtn} onPress={handleStartTimer}>
                <Text style={styles.timerBtnText}>⏱️ Start 20-min Timer</Text>
              </TouchableOpacity>
            : <View style={styles.timerActive}><Text style={styles.timerActiveText}>⏱️ Timer Running</Text></View>
          }
          <Text style={styles.designCount}>{designs.length}/{MAX_DESIGNS} designs</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['test', 'results'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'test' ? '🏗️ Test Structure' : `📊 Results (${designs.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab: Test ── */}
      {activeTab === 'test' && (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Instructions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Instructions</Text>
            {[
              '1. Build an anti-vibration layer by folding paper/cardboard.',
              '2. Place a flat cardboard platform on top.',
              '3. Place your phone in the centre of the platform.',
              '4. Tap "Start Sensor" and shake the table gently.',
              '5. Record the peak vibration and enter your design details.',
              '6. Repeat with up to 3 different designs.',
            ].map((step, i) => (
              <Text key={i} style={styles.instructionText}>{step}</Text>
            ))}
          </View>

          {/* Live vibration meter */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📡 Live Vibration Sensor</Text>
            <VibrationMeter magnitude={magnitude} peak={peakMagnitude} />
            <View style={styles.sensorBtnRow}>
              <TouchableOpacity
                style={[styles.button, isActive ? styles.buttonStop : styles.buttonStart]}
                onPress={isActive ? stop : handleStartSensor}
              >
                <Text style={styles.buttonText}>
                  {isActive ? '⏹ Stop Sensor' : '▶️ Start Sensor'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonReset} onPress={resetPeak}>
                <Text style={styles.buttonResetText}>↺ Reset Peak</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Design form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Record Design ({designs.length}/{MAX_DESIGNS})
            </Text>

            <Text style={styles.inputLabel}>Design Name</Text>
            <TextInput
              style={styles.input}
              value={form.designName}
              onChangeText={v => updateForm('designName', v)}
              placeholder="e.g. 4 folds + 4 pillars"
              placeholderTextColor="#aaa"
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fold Count</Text>
                <TextInput
                  style={styles.input}
                  value={form.foldCount}
                  onChangeText={v => updateForm('foldCount', v)}
                  placeholder="e.g. 4"
                  keyboardType="numeric"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pillar Count</Text>
                <TextInput
                  style={styles.input}
                  value={form.pillarCount}
                  onChangeText={v => updateForm('pillarCount', v)}
                  placeholder="e.g. 4"
                  keyboardType="numeric"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Predicted Movement</Text>
            <TextInput
              style={styles.input}
              value={form.predictedMovement}
              onChangeText={v => updateForm('predictedMovement', v)}
              placeholder="e.g. +/- 1cm"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.inputLabel}>Notes / Observations</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.notes}
              onChangeText={v => updateForm('notes', v)}
              placeholder="What did you observe? Any surprises?"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
            />

            {peakMagnitude > 0 && (
              <View style={styles.peakCapture}>
                <Text style={styles.peakCaptureText}>
                  📡 Captured peak: {peakMagnitude.toFixed(3)} g — {getVibrationLabel(peakMagnitude).label}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonCapture]}
              onPress={handleCaptureDesign}
            >
              <Text style={styles.buttonText}>💾 Save Design</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Tab: Results ── */}
      {activeTab === 'results' && (
        <ScrollView contentContainerStyle={styles.content}>
          {designs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No designs yet.</Text>
              <Text style={styles.emptySubtext}>Go to Test tab to record a design.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Results Table</Text>

              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 2 }]}>Design</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Predicted</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Peak (g)</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Right?</Text>
              </View>

              {designs.map((d, idx) => {
                const vib = getVibrationLabel(d.peakMagnitude ?? 0);
                return (
                  <View key={d.id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.tdText}>{d.designName}</Text>
                      <Text style={styles.tdSubtext}>
                        {d.foldCount} folds · {d.pillarCount} pillars
                      </Text>
                      {d.notes ? <Text style={styles.tdNote}>{d.notes}</Text> : null}
                    </View>
                    <Text style={[styles.tdText, { flex: 1 }]}>{d.predictedMovement}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tdText, { color: vib.color, fontWeight: 'bold' }]}>
                        {d.peakMagnitude?.toFixed(3) ?? '—'}
                      </Text>
                      <Text style={[styles.tdSubtext, { color: vib.color }]}>{vib.label}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        style={[styles.yesNoBtn, d.wasRight === true && styles.yesNoBtnYes]}
                        onPress={() => toggleWasRight(d.id, true)}
                      >
                        <Text style={styles.yesNoText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.yesNoBtn, d.wasRight === false && styles.yesNoBtnNo]}
                        onPress={() => toggleWasRight(d.id, false)}
                      >
                        <Text style={styles.yesNoText}>✗</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteDesign(d.id)}>
                        <Text style={{ fontSize: 16 }}>🗑</Text>
                      </TouchableOpacity>
                    </View>
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

  header: { backgroundColor: '#403294', padding: 16 },
  headerRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  timerBtn: { backgroundColor: '#ffffff30', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  timerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  timerActive: { backgroundColor: '#00875a', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  timerActiveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  designCount: { marginLeft: 'auto' as any, color: '#c0b6f2', fontSize: 12, fontWeight: '700' },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dfe1e6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#403294' },
  tabText: { fontSize: 13, color: '#6b778c', fontWeight: '600' },
  tabTextActive: { color: '#403294' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#172b4d', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#403294', paddingLeft: 8 },

  instructionText: { fontSize: 13, color: '#42526e', marginBottom: 6, lineHeight: 20 },

  meterContainer: { marginBottom: 12 },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  meterLabel: { fontSize: 12, color: '#6b778c', fontWeight: '600' },
  meterValue: { fontSize: 16, fontWeight: 'bold' },
  meterBar: { width: '100%', height: 14, backgroundColor: '#dfe1e6', borderRadius: 7, overflow: 'hidden', marginBottom: 4 },
  meterFill: { height: '100%', borderRadius: 7 },
  meterStatus: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  sensorBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: { flex: 1, borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 4 },
  buttonStart: { backgroundColor: '#403294' },
  buttonStop: { backgroundColor: '#de350b' },
  buttonCapture: { backgroundColor: '#00875a' },
  buttonSubmit: { backgroundColor: '#6554c0', marginBottom: 8 },
  buttonReset: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 8, borderWidth: 1, borderColor: '#403294', alignItems: 'center', justifyContent: 'center' },
  buttonResetText: { color: '#403294', fontWeight: '700', fontSize: 13 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  inputLabel: { fontSize: 13, color: '#42526e', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#dfe1e6', borderRadius: 8, padding: 10, fontSize: 14, color: '#172b4d', marginBottom: 10, backgroundColor: '#fafbfc' },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row' },

  peakCapture: { backgroundColor: '#eae6ff', borderRadius: 8, padding: 10, marginBottom: 10 },
  peakCaptureText: { fontSize: 13, color: '#403294', fontWeight: '600' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#403294', borderRadius: 6, padding: 8, marginBottom: 4 },
  thCell: { fontSize: 11, color: '#fff', fontWeight: '700' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f4f5f7', alignItems: 'center' },
  tableRowEven: { backgroundColor: '#fafbfc' },
  tdText: { fontSize: 12, color: '#172b4d' },
  tdSubtext: { fontSize: 10, color: '#6b778c', marginTop: 2 },
  tdNote: { fontSize: 10, color: '#0052cc', marginTop: 2, fontStyle: 'italic' },

  yesNoBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#dfe1e6', alignItems: 'center', justifyContent: 'center' },
  yesNoBtnYes: { backgroundColor: '#00875a' },
  yesNoBtnNo: { backgroundColor: '#de350b' },
  yesNoText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6b778c', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#aaa', marginTop: 4 },

  successBox: { backgroundColor: '#e3fcef', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 8 },
  successText: { color: '#006644', fontWeight: '700', fontSize: 15 },
});
