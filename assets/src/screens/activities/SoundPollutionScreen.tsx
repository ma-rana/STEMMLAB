// src/screens/activities/SoundPollutionScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSoundMeter } from '../../hooks/useSoundMeter';
import { useLocation } from '../../hooks/useLocation';
import { saveSoundResult } from '../../services/firebase/activityService';
import { SoundMeasurement, SoundActivityResult } from '../../types';

// ─── Hearing damage risk helper ───────────────────────────────────────────
function getRiskLevel(db: number): { label: string; color: string } {
  if (db < 30) return { label: 'No risk', color: '#27ae60' };
  if (db < 60) return { label: 'Safe', color: '#2ecc71' };
  if (db < 85) return { label: 'Generally safe', color: '#f1c40f' };
  if (db < 90) return { label: '⚠️ Damage possible (long exposure)', color: '#e67e22' };
  if (db < 100) return { label: '⚠️ Damage likely (short exposure)', color: '#e74c3c' };
  if (db < 110) return { label: '🔴 Serious damage in minutes', color: '#c0392b' };
  return { label: '🚨 Immediate damage!', color: '#922b21' };
}

// ─── dB gauge component ────────────────────────────────────────────────────
const DbGauge: React.FC<{ value: number }> = ({ value }) => {
  const risk = getRiskLevel(value);
  const percentage = Math.min((value / 140) * 100, 100);

  return (
    <View style={styles.gaugeContainer}>
      <Text style={styles.gaugeValue}>{value} dB</Text>
      <View style={styles.gaugeBar}>
        <View
          style={[
            styles.gaugeFill,
            { width: `${percentage}%` as any, backgroundColor: risk.color },
          ]}
        />
      </View>
      <Text style={[styles.gaugeRisk, { color: risk.color }]}>{risk.label}</Text>
    </View>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────
interface Props {
  teamId: string;
  teamName: string;
}

const MAX_MEASUREMENTS = 5;

export default function SoundPollutionScreen({ teamId, teamName }: Props) {
  const { decibels, isRecording, hasPermission, startMeasuring, stopMeasuring } =
    useSoundMeter();
  const { getCurrentLocation, isLoading: locationLoading } = useLocation();

  const [measurements, setMeasurements] = useState<SoundMeasurement[]>([]);
  const [currentAction, setCurrentAction] = useState('');
  const [currentPrediction, setCurrentPrediction] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Capture one reading with GPS tag
  const handleCapture = useCallback(async () => {
    if (!currentAction.trim()) {
      Alert.alert('Missing info', 'Please enter the action name first.');
      return;
    }
    if (measurements.length >= MAX_MEASUREMENTS) {
      Alert.alert('Max reached', `You can record up to ${MAX_MEASUREMENTS} measurements.`);
      return;
    }

    const coords = await getCurrentLocation();

    const newMeasurement: SoundMeasurement = {
      id: Date.now().toString(),
      action: currentAction.trim(),
      prediction: currentPrediction.trim(),
      decibels,
      latitude: coords?.latitude ?? 0,
      longitude: coords?.longitude ?? 0,
      timestamp: new Date(),
      wasRight: null,
    };

    setMeasurements(prev => [...prev, newMeasurement]);
    setCurrentAction('');
    setCurrentPrediction('');
  }, [currentAction, currentPrediction, decibels, measurements.length, getCurrentLocation]);

  // Mark whether prediction was correct
  const toggleWasRight = useCallback((id: string, value: boolean) => {
    setMeasurements(prev =>
      prev.map(m => (m.id === id ? { ...m, wasRight: value } : m))
    );
  }, []);

  // Delete a measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  // Submit all results to Firestore
  const handleSubmit = useCallback(async () => {
    if (measurements.length === 0) {
      Alert.alert('No data', 'Record at least one measurement before submitting.');
      return;
    }

    setIsSaving(true);
    try {
      const result: SoundActivityResult = {
        teamId,
        teamName,
        measurements,
        createdAt: new Date(),
      };
      await saveSoundResult(result);
      setSubmitted(true);
      Alert.alert('✅ Submitted!', 'Your sound pollution results have been saved.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save results. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [measurements, teamId, teamName]);

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Microphone permission is required for this activity.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔊 Activity 2</Text>
        <Text style={styles.subtitle}>Sound Pollution Hunter</Text>
        <Text style={styles.description}>
          Measure noise levels from different classroom actions. Record the dB level
          and GPS location for each action, then compare your predictions.
        </Text>
      </View>

      {/* Live dB Meter */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Sound Meter</Text>
        <DbGauge value={decibels} />
        <TouchableOpacity
          style={[styles.button, isRecording ? styles.buttonStop : styles.buttonStart]}
          onPress={isRecording ? stopMeasuring : startMeasuring}
        >
          <Text style={styles.buttonText}>
            {isRecording ? '⏹ Stop Meter' : '▶️ Start Meter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add measurement */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Record a Measurement</Text>
        <Text style={styles.inputLabel}>Action (e.g. dropping a book on the table)</Text>
        <TextInput
          style={styles.input}
          value={currentAction}
          onChangeText={setCurrentAction}
          placeholder="Describe the action..."
          placeholderTextColor="#aaa"
        />
        <Text style={styles.inputLabel}>Your Prediction (louder or softer than?)</Text>
        <TextInput
          style={styles.input}
          value={currentPrediction}
          onChangeText={setCurrentPrediction}
          placeholder="e.g. Louder than talking"
          placeholderTextColor="#aaa"
        />
        <Text style={styles.liveDbText}>Current reading: {decibels} dB</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonCapture]}
          onPress={handleCapture}
          disabled={locationLoading || !isRecording}
        >
          {locationLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📍 Capture Reading + GPS</Text>
          )}
        </TouchableOpacity>
        {!isRecording && (
          <Text style={styles.hint}>Start the meter before capturing a reading.</Text>
        )}
      </View>

      {/* Results table */}
      {measurements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Results ({measurements.length}/{MAX_MEASUREMENTS})
          </Text>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Action</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Prediction</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Result (dB)</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Right?</Text>
          </View>

          {measurements.map((m, idx) => {
            const risk = getRiskLevel(m.decibels);
            return (
              <View
                key={m.id}
                style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : {}]}
              >
                <View style={{ flex: 2 }}>
                  <Text style={styles.tableCell}>{m.action}</Text>
                  <Text style={styles.locationText}>
                    📍 {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1 }]}>{m.prediction || '—'}</Text>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.tableCell, { color: risk.color, fontWeight: 'bold' }]}>
                    {m.decibels} dB
                  </Text>
                  <Text style={[styles.riskBadge, { color: risk.color }]}>{risk.label}</Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity
                    style={[
                      styles.yesNoBtn,
                      m.wasRight === true && styles.yesNoBtnActive,
                    ]}
                    onPress={() => toggleWasRight(m.id, true)}
                  >
                    <Text style={styles.yesNoText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.yesNoBtn,
                      m.wasRight === false && styles.yesNoBtnWrong,
                    ]}
                    onPress={() => toggleWasRight(m.id, false)}
                  >
                    <Text style={styles.yesNoText}>✗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMeasurement(m.id)}>
                    <Text style={styles.deleteText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Hearing risk reference table */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Hearing Damage Risk Reference</Text>
        {[
          { range: '0–30 dB', example: 'Whisper, library', risk: 'No risk', color: '#27ae60' },
          { range: '30–60 dB', example: 'Normal conversation', risk: 'Safe', color: '#2ecc71' },
          { range: '60–85 dB', example: 'Vacuum cleaner', risk: 'Generally safe', color: '#f1c40f' },
          { range: '85–90 dB', example: 'Lawn mower, loud classroom', risk: '⚠️ Possible damage', color: '#e67e22' },
          { range: '90–100 dB', example: 'Motorbike, power tools', risk: '⚠️ Likely damage', color: '#e74c3c' },
          { range: '100–110 dB', example: 'Rock concert, chainsaw', risk: '🔴 Minutes to damage', color: '#c0392b' },
          { range: '110+ dB', example: 'Jet engine, explosion', risk: '🚨 Immediate damage', color: '#922b21' },
        ].map(row => (
          <View key={row.range} style={styles.referenceRow}>
            <Text style={styles.referenceRange}>{row.range}</Text>
            <Text style={styles.referenceExample}>{row.example}</Text>
            <Text style={[styles.referenceRisk, { color: row.color }]}>{row.risk}</Text>
          </View>
        ))}
      </View>

      {/* Submit */}
      {!submitted && (
        <TouchableOpacity
          style={[styles.button, styles.buttonSubmit]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>✅ Submit Results to Cloud</Text>
          )}
        </TouchableOpacity>
      )}

      {submitted && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            ✅ Results submitted! Check the leaderboard.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#e74c3c', fontSize: 16, textAlign: 'center' },

  header: {
    backgroundColor: '#0052cc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 18, color: '#deebff', marginBottom: 8 },
  description: { fontSize: 13, color: '#b3d4ff', lineHeight: 20 },

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
    fontSize: 16,
    fontWeight: '700',
    color: '#172b4d',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0052cc',
    paddingLeft: 8,
  },

  // Gauge
  gaugeContainer: { alignItems: 'center', marginBottom: 12 },
  gaugeValue: { fontSize: 48, fontWeight: 'bold', color: '#172b4d' },
  gaugeBar: {
    width: '100%',
    height: 16,
    backgroundColor: '#dfe1e6',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  gaugeFill: { height: '100%', borderRadius: 8 },
  gaugeRisk: { fontSize: 13, fontWeight: '600' },

  // Inputs
  inputLabel: { fontSize: 13, color: '#42526e', marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#dfe1e6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#172b4d',
    marginBottom: 10,
    backgroundColor: '#fafbfc',
  },
  liveDbText: { fontSize: 13, color: '#6b778c', marginBottom: 8 },
  hint: { fontSize: 12, color: '#6b778c', marginTop: 6, fontStyle: 'italic' },

  // Buttons
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonStart: { backgroundColor: '#0052cc' },
  buttonStop: { backgroundColor: '#de350b' },
  buttonCapture: { backgroundColor: '#00875a' },
  buttonSubmit: { backgroundColor: '#6554c0', marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0052cc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  tableHeaderText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f5f7',
    alignItems: 'center',
  },
  tableRowEven: { backgroundColor: '#fafbfc' },
  tableCell: { fontSize: 12, color: '#172b4d' },
  locationText: { fontSize: 10, color: '#6b778c', marginTop: 2 },
  riskBadge: { fontSize: 10, fontWeight: '600' },

  // Yes/No buttons
  yesNoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dfe1e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoBtnActive: { backgroundColor: '#00875a' },
  yesNoBtnWrong: { backgroundColor: '#de350b' },
  yesNoText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  deleteText: { fontSize: 16, marginLeft: 4 },

  // Reference table
  referenceRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f5f7',
    alignItems: 'center',
  },
  referenceRange: { width: 80, fontSize: 12, fontWeight: '700', color: '#172b4d' },
  referenceExample: { flex: 1, fontSize: 11, color: '#42526e' },
  referenceRisk: { fontSize: 11, fontWeight: '600', textAlign: 'right' },

  // Success
  successBox: {
    backgroundColor: '#e3fcef',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  successText: { color: '#006644', fontWeight: '700', fontSize: 15 },
});
