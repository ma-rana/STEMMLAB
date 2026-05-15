// src/screens/activities/SoundPollutionScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useSoundMeter } from '../../hooks/useSoundMeter';
import { useLocation } from '../../hooks/useLocation';
import { saveSoundResult } from '../../services/firebase/activityService';
import {
  saveSoundMeasurementLocal,
  getSoundMeasurementsLocal,
} from '../../services/storage/sqliteService';
import {
  scheduleEngineeringTimer,
  cancelAllNotifications,
  sendImmediateNotification,
} from '../../services/notifications/notificationService';
import { SoundMeasurement, SoundActivityResult } from '../../types';

function getRiskLevel(db: number): { label: string; color: string } {
  if (db < 30) return { label: 'No risk', color: '#27ae60' };
  if (db < 60) return { label: 'Safe', color: '#2ecc71' };
  if (db < 85) return { label: 'Generally safe', color: '#f1c40f' };
  if (db < 90) return { label: '⚠️ Damage possible', color: '#e67e22' };
  if (db < 100) return { label: '⚠️ Damage likely', color: '#e74c3c' };
  if (db < 110) return { label: '🔴 Serious damage', color: '#c0392b' };
  return { label: '🚨 Immediate damage!', color: '#922b21' };
}

function getMarkerColor(db: number): string {
  if (db < 60) return '#27ae60';
  if (db < 85) return '#f1c40f';
  if (db < 90) return '#e67e22';
  return '#e74c3c';
}

const DbGauge: React.FC<{ value: number }> = ({ value }) => {
  const risk = getRiskLevel(value);
  const percentage = Math.min((value / 140) * 100, 100);
  return (
    <View style={styles.gaugeContainer}>
      <Text style={styles.gaugeValue}>{value} dB</Text>
      <View style={styles.gaugeBar}>
        <View style={[styles.gaugeFill, { width: `${percentage}%` as any, backgroundColor: risk.color }]} />
      </View>
      <Text style={[styles.gaugeRisk, { color: risk.color }]}>{risk.label}</Text>
    </View>
  );
};

interface Props { teamId: string; teamName: string; }
const MAX_MEASUREMENTS = 6;

export default function SoundPollutionScreen({ teamId, teamName }: Props) {
  const { decibels, isRecording, hasPermission, startMeasuring, stopMeasuring } = useSoundMeter();
  const { getCurrentLocation, isLoading: locationLoading } = useLocation();
  const [measurements, setMeasurements] = useState<SoundMeasurement[]>([]);
  const [currentAction, setCurrentAction] = useState('');
  const [currentPrediction, setCurrentPrediction] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'measure' | 'table' | 'map'>('measure');
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    const saved = getSoundMeasurementsLocal(teamId);
    if (saved.length > 0) setMeasurements(saved);
  }, [teamId]);

  const handleStartTimer = async () => {
    await scheduleEngineeringTimer('Sound Pollution Hunter');
    setTimerStarted(true);
    Alert.alert('⏱️ Timer Started', 'You will be notified at 15 and 20 minutes.');
  };

  const handleCapture = useCallback(async () => {
    if (!currentAction.trim()) {
      Alert.alert('Missing info', 'Please enter the action name first.');
      return;
    }
    if (measurements.length >= MAX_MEASUREMENTS) {
      Alert.alert('Max reached', `Maximum ${MAX_MEASUREMENTS} measurements.`);
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
    saveSoundMeasurementLocal(teamId, newMeasurement);
    setMeasurements(prev => [...prev, newMeasurement]);
    setCurrentAction('');
    setCurrentPrediction('');
    await sendImmediateNotification('📍 Saved', `${newMeasurement.action}: ${newMeasurement.decibels} dB`);
  }, [currentAction, currentPrediction, decibels, measurements.length, getCurrentLocation, teamId]);

  const toggleWasRight = useCallback((id: string, value: boolean) => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, wasRight: value } : m));
  }, []);

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (measurements.length === 0) {
      Alert.alert('No data', 'Record at least one measurement.');
      return;
    }
    setIsSaving(true);
    try {
      const result: SoundActivityResult = { teamId, teamName, measurements, createdAt: new Date() };
      await saveSoundResult(result);
      await cancelAllNotifications();
      setSubmitted(true);
      Alert.alert('✅ Submitted!', 'Results saved to cloud!');
    } catch {
      Alert.alert('Offline', 'Saved locally. Will sync when online.');
      setSubmitted(true);
    } finally {
      setIsSaving(false);
    }
  }, [measurements, teamId, teamName]);

  const mapRegion = measurements.length > 0
    ? { latitude: measurements[0].latitude, longitude: measurements[0].longitude, latitudeDelta: 0.001, longitudeDelta: 0.001 }
    : { latitude: -37.8136, longitude: 144.9631, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Microphone permission required.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f5f7' }}>
      <View style={styles.header}>
        <Text style={styles.title}>🔊 Activity 2 – Sound Pollution Hunter</Text>
        <View style={styles.headerRow}>
          {!timerStarted
            ? <TouchableOpacity style={styles.timerBtn} onPress={handleStartTimer}>
                <Text style={styles.timerBtnText}>⏱️ Start 20-min Timer</Text>
              </TouchableOpacity>
            : <View style={styles.timerActive}><Text style={styles.timerActiveText}>⏱️ Timer Running</Text></View>
          }
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['measure', 'table', 'map'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'measure' ? '🎙️ Measure' : tab === 'table' ? '📊 Results' : '🗺️ Map'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'measure' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Sound Meter</Text>
            <DbGauge value={decibels} />
            <TouchableOpacity style={[styles.button, isRecording ? styles.buttonStop : styles.buttonStart]} onPress={isRecording ? stopMeasuring : startMeasuring}>
              <Text style={styles.buttonText}>{isRecording ? '⏹ Stop Meter' : '▶️ Start Meter'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Record a Measurement</Text>
            <Text style={styles.inputLabel}>Action</Text>
            <TextInput style={styles.input} value={currentAction} onChangeText={setCurrentAction} placeholder="e.g. Dropping a book" placeholderTextColor="#aaa" />
            <Text style={styles.inputLabel}>Your Prediction</Text>
            <TextInput style={styles.input} value={currentPrediction} onChangeText={setCurrentPrediction} placeholder="e.g. Louder than talking" placeholderTextColor="#aaa" />
            <Text style={styles.liveDbText}>Current: {decibels} dB</Text>
            <TouchableOpacity style={[styles.button, styles.buttonCapture]} onPress={handleCapture} disabled={locationLoading || !isRecording}>
              {locationLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>📍 Capture + GPS ({measurements.length}/{MAX_MEASUREMENTS})</Text>}
            </TouchableOpacity>
            {!isRecording && <Text style={styles.hint}>Start the meter before capturing.</Text>}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Hearing Damage Reference</Text>
            {[
              { range: '0–30 dB', example: 'Whisper', risk: 'No risk', color: '#27ae60' },
              { range: '30–60 dB', example: 'Conversation', risk: 'Safe', color: '#2ecc71' },
              { range: '60–85 dB', example: 'Vacuum cleaner', risk: 'Generally safe', color: '#f1c40f' },
              { range: '85–90 dB', example: 'Loud classroom', risk: '⚠️ Possible', color: '#e67e22' },
              { range: '90–100 dB', example: 'Motorbike', risk: '⚠️ Likely', color: '#e74c3c' },
              { range: '100+ dB', example: 'Rock concert', risk: '🔴 Immediate', color: '#c0392b' },
            ].map(row => (
              <View key={row.range} style={styles.referenceRow}>
                <Text style={styles.referenceRange}>{row.range}</Text>
                <Text style={styles.referenceExample}>{row.example}</Text>
                <Text style={[styles.referenceRisk, { color: row.color }]}>{row.risk}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {activeTab === 'table' && (
        <ScrollView contentContainerStyle={styles.content}>
          {measurements.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No measurements yet.</Text>
              <Text style={styles.emptySubtext}>Go to Measure tab to record.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Results ({measurements.length})</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 2 }]}>Action</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Predict</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>dB</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>Right?</Text>
              </View>
              {measurements.map((m, idx) => {
                const risk = getRiskLevel(m.decibels);
                return (
                  <View key={m.id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.tdText}>{m.action}</Text>
                      <Text style={styles.locationText}>📍 {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}</Text>
                    </View>
                    <Text style={[styles.tdText, { flex: 1 }]}>{m.prediction || '—'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tdText, { color: risk.color, fontWeight: 'bold' }]}>{m.decibels}</Text>
                      <Text style={[styles.riskBadge, { color: risk.color }]}>{risk.label}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      <TouchableOpacity style={[styles.yesNoBtn, m.wasRight === true && styles.yesNoBtnYes]} onPress={() => toggleWasRight(m.id, true)}>
                        <Text style={styles.yesNoText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.yesNoBtn, m.wasRight === false && styles.yesNoBtnNo]} onPress={() => toggleWasRight(m.id, false)}>
                        <Text style={styles.yesNoText}>✗</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteMeasurement(m.id)}>
                        <Text style={{ fontSize: 16 }}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {!submitted
            ? <TouchableOpacity style={[styles.button, styles.buttonSubmit]} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>✅ Submit to Cloud</Text>}
              </TouchableOpacity>
            : <View style={styles.successBox}><Text style={styles.successText}>✅ Results submitted!</Text></View>
          }
        </ScrollView>
      )}

      {activeTab === 'map' && (
        <View style={{ flex: 1 }}>
          {measurements.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No measurements yet.</Text>
              <Text style={styles.emptySubtext}>Record some measurements first.</Text>
            </View>
          ) : (
            <>
              <MapView style={{ flex: 1 }} initialRegion={mapRegion}>
                {measurements.map(m => {
                  const risk = getRiskLevel(m.decibels);
                  return (
                    <React.Fragment key={m.id}>
                      <Marker coordinate={{ latitude: m.latitude, longitude: m.longitude }} title={m.action} description={`${m.decibels} dB — ${risk.label}`} pinColor={getMarkerColor(m.decibels)} />
                      <Circle center={{ latitude: m.latitude, longitude: m.longitude }} radius={m.decibels > 85 ? 8 : 4} fillColor={risk.color + '40'} strokeColor={risk.color} strokeWidth={1} />
                    </React.Fragment>
                  );
                })}
              </MapView>
              <View style={styles.mapLegend}>
                <Text style={styles.mapLegendTitle}>Zone Legend</Text>
                {[
                  { color: '#27ae60', label: 'Safe (<60 dB)' },
                  { color: '#f1c40f', label: 'Moderate (60–85 dB)' },
                  { color: '#e67e22', label: 'Loud (85–90 dB)' },
                  { color: '#e74c3c', label: 'Dangerous (90+ dB)' },
                ].map(item => (
                  <View key={item.label} style={styles.mapLegendRow}>
                    <View style={[styles.mapLegendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.mapLegendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#e74c3c', fontSize: 16, textAlign: 'center' },
  header: { backgroundColor: '#0052cc', padding: 16 },
  headerRow: { flexDirection: 'row', marginTop: 8 },
  title: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  timerBtn: { backgroundColor: '#ffffff30', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  timerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  timerActive: { backgroundColor: '#00875a', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  timerActiveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dfe1e6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#0052cc' },
  tabText: { fontSize: 13, color: '#6b778c', fontWeight: '600' },
  tabTextActive: { color: '#0052cc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#172b4d', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#0052cc', paddingLeft: 8 },
  gaugeContainer: { alignItems: 'center', marginBottom: 12 },
  gaugeValue: { fontSize: 48, fontWeight: 'bold', color: '#172b4d' },
  gaugeBar: { width: '100%', height: 16, backgroundColor: '#dfe1e6', borderRadius: 8, overflow: 'hidden', marginVertical: 8 },
  gaugeFill: { height: '100%', borderRadius: 8 },
  gaugeRisk: { fontSize: 13, fontWeight: '600' },
  inputLabel: { fontSize: 13, color: '#42526e', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#dfe1e6', borderRadius: 8, padding: 10, fontSize: 14, color: '#172b4d', marginBottom: 10, backgroundColor: '#fafbfc' },
  liveDbText: { fontSize: 13, color: '#6b778c', marginBottom: 8 },
  hint: { fontSize: 12, color: '#6b778c', marginTop: 6, fontStyle: 'italic' },
  button: { borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonStart: { backgroundColor: '#0052cc' },
  buttonStop: { backgroundColor: '#de350b' },
  buttonCapture: { backgroundColor: '#00875a' },
  buttonSubmit: { backgroundColor: '#6554c0', marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0052cc', borderRadius: 6, padding: 8, marginBottom: 4 },
  thCell: { fontSize: 11, color: '#fff', fontWeight: '700' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f4f5f7', alignItems: 'center' },
  tableRowEven: { backgroundColor: '#fafbfc' },
  tdText: { fontSize: 12, color: '#172b4d' },
  locationText: { fontSize: 10, color: '#6b778c', marginTop: 2 },
  riskBadge: { fontSize: 10, fontWeight: '600' },
  yesNoBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#dfe1e6', alignItems: 'center', justifyContent: 'center' },
  yesNoBtnYes: { backgroundColor: '#00875a' },
  yesNoBtnNo: { backgroundColor: '#de350b' },
  yesNoText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  referenceRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f4f5f7', alignItems: 'center' },
  referenceRange: { width: 80, fontSize: 12, fontWeight: '700', color: '#172b4d' },
  referenceExample: { flex: 1, fontSize: 11, color: '#42526e' },
  referenceRisk: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#6b778c', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#aaa', marginTop: 4 },
  successBox: { backgroundColor: '#e3fcef', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 8 },
  successText: { color: '#006644', fontWeight: '700', fontSize: 15 },
  mapLegend: { position: 'absolute', bottom: 16, left: 16, backgroundColor: '#fff', borderRadius: 8, padding: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapLegendTitle: { fontSize: 12, fontWeight: '700', color: '#172b4d', marginBottom: 6 },
  mapLegendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  mapLegendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  mapLegendText: { fontSize: 11, color: '#42526e' },
});
