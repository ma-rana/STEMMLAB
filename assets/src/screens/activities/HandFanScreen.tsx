// src/screens/activities/HandFanScreen.tsx
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
import { saveHandFanResult } from '../../services/firebase/activityService';
import { FanDesign, HandFanActivityResult } from '../../types';

// ─── Stiffness coefficients from spec ─────────────────────────────────────
const STIFFNESS = {
  paper: 0.05,      // Thin printer paper
  cardboard: 0.5,   // Thin cardboard
};

// Force approximation: F ≈ k × θ (θ in radians)
function calculateForce(material: 'paper' | 'cardboard', bendDegrees: number): number {
  const k = STIFFNESS[material];
  const thetaRad = (bendDegrees * Math.PI) / 180;
  return Math.round(k * thetaRad * 1000) / 1000; // Newtons, 3 decimal places
}

// ─── Force summary card ────────────────────────────────────────────────────
const ForceCard: React.FC<{ design: FanDesign }> = ({ design }) => {
  if (design.actualBend === null) return null;
  const force = calculateForce(design.material, design.actualBend);
  return (
    <View style={styles.forceCard}>
      <Text style={styles.forceLabel}>Estimated Force (F ≈ k × θ)</Text>
      <Text style={styles.forceValue}>{force} N</Text>
      <Text style={styles.forceFormula}>
        k = {STIFFNESS[design.material]} N/rad × θ ={' '}
        {((design.actualBend * Math.PI) / 180).toFixed(3)} rad
      </Text>
    </View>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────
interface Props {
  teamId: string;
  teamName: string;
}

const DISTANCES = [15, 30, 45];
const MAX_DESIGNS = 3;

export default function HandFanScreen({ teamId, teamName }: Props) {
  const [designs, setDesigns] = useState<FanDesign[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state for adding a new design
  const [form, setForm] = useState({
    designName: '',
    predictedBend: '',
    actualBend: '',
    distance: 30,
    material: 'paper' as 'paper' | 'cardboard',
    notes: '',
  });

  const updateForm = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddDesign = useCallback(() => {
    if (!form.designName.trim()) {
      Alert.alert('Missing info', 'Please enter a design name.');
      return;
    }
    if (!form.predictedBend || isNaN(Number(form.predictedBend))) {
      Alert.alert('Missing info', 'Please enter a predicted bend angle.');
      return;
    }
    if (designs.length >= MAX_DESIGNS) {
      Alert.alert('Max reached', `You can test up to ${MAX_DESIGNS} designs.`);
      return;
    }

    const newDesign: FanDesign = {
      id: Date.now().toString(),
      designName: form.designName.trim(),
      predictedBend: Number(form.predictedBend),
      actualBend: form.actualBend ? Number(form.actualBend) : null,
      distance: form.distance,
      material: form.material,
      notes: form.notes.trim(),
      wasRight: null,
    };

    setDesigns(prev => [...prev, newDesign]);

    // Reset form
    setForm({
      designName: '',
      predictedBend: '',
      actualBend: '',
      distance: 30,
      material: 'paper',
      notes: '',
    });
  }, [form, designs.length]);

  const updateActualBend = useCallback((id: string, value: string) => {
    setDesigns(prev =>
      prev.map(d =>
        d.id === id ? { ...d, actualBend: value ? Number(value) : null } : d
      )
    );
  }, []);

  const toggleWasRight = useCallback((id: string, value: boolean) => {
    setDesigns(prev =>
      prev.map(d => (d.id === id ? { ...d, wasRight: value } : d))
    );
  }, []);

  const deleteDesign = useCallback((id: string) => {
    setDesigns(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (designs.length === 0) {
      Alert.alert('No data', 'Add at least one fan design before submitting.');
      return;
    }
    setIsSaving(true);
    try {
      const result: HandFanActivityResult = {
        teamId,
        teamName,
        designs,
        createdAt: new Date(),
      };
      await saveHandFanResult(result);
      setSubmitted(true);
      Alert.alert('✅ Submitted!', 'Your hand fan results have been saved.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save results. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [designs, teamId, teamName]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🌬️ Activity 3</Text>
        <Text style={styles.subtitle}>Hand Fan Challenge</Text>
        <Text style={styles.description}>
          Test how different fan designs move paper and cardboard. Measure the bend
          angle at different distances and compare your designs.
        </Text>
      </View>

      {/* Instructions card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Instructions</Text>
        {[
          '1. Stand paper upright on a table.',
          '2. Fan air from the selected distance (15, 30, or 45 cm).',
          '3. Observe and record the bend angle in degrees.',
          '4. Repeat with different fan designs and materials.',
          '5. Compare results across designs.',
        ].map((step, i) => (
          <Text key={i} style={styles.instructionText}>{step}</Text>
        ))}
      </View>

      {/* Add design form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Add Fan Design ({designs.length}/{MAX_DESIGNS})
        </Text>

        <Text style={styles.inputLabel}>Design Name</Text>
        <TextInput
          style={styles.input}
          value={form.designName}
          onChangeText={v => updateForm('designName', v)}
          placeholder="e.g. 1cm back and forward folds"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.inputLabel}>Material</Text>
        <View style={styles.segmentRow}>
          {(['paper', 'cardboard'] as const).map(mat => (
            <TouchableOpacity
              key={mat}
              style={[
                styles.segmentBtn,
                form.material === mat && styles.segmentBtnActive,
              ]}
              onPress={() => updateForm('material', mat)}
            >
              <Text
                style={[
                  styles.segmentText,
                  form.material === mat && styles.segmentTextActive,
                ]}
              >
                {mat === 'paper' ? '📄 Paper' : '📦 Cardboard'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.stiffnessNote}>
          k = {STIFFNESS[form.material]} N/rad (stiffness coefficient)
        </Text>

        <Text style={styles.inputLabel}>Fan Distance</Text>
        <View style={styles.segmentRow}>
          {DISTANCES.map(d => (
            <TouchableOpacity
              key={d}
              style={[
                styles.segmentBtn,
                form.distance === d && styles.segmentBtnActive,
              ]}
              onPress={() => updateForm('distance', d)}
            >
              <Text
                style={[
                  styles.segmentText,
                  form.distance === d && styles.segmentTextActive,
                ]}
              >
                {d} cm
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Predicted Bend Angle (°)</Text>
        <TextInput
          style={styles.input}
          value={form.predictedBend}
          onChangeText={v => updateForm('predictedBend', v)}
          placeholder="e.g. 30"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>Actual Bend Angle (°) — fill after testing</Text>
        <TextInput
          style={styles.input}
          value={form.actualBend}
          onChangeText={v => updateForm('actualBend', v)}
          placeholder="e.g. 28"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>Observation Notes</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={form.notes}
          onChangeText={v => updateForm('notes', v)}
          placeholder="What did you observe? Any surprises?"
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, styles.buttonAdd]}
          onPress={handleAddDesign}
        >
          <Text style={styles.buttonText}>➕ Add Design</Text>
        </TouchableOpacity>
      </View>

      {/* Results table */}
      {designs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Results Table</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 2 }]}>Design</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Predicted</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Actual</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Force</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Right?</Text>
          </View>

          {designs.map((d, idx) => {
            const force = d.actualBend !== null
              ? calculateForce(d.material, d.actualBend)
              : null;
            return (
              <View
                key={d.id}
                style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : {}]}
              >
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdText}>{d.designName}</Text>
                  <Text style={styles.tdSubtext}>
                    {d.material} | {d.distance}cm
                  </Text>
                  {d.notes ? (
                    <Text style={styles.tdNote}>{d.notes}</Text>
                  ) : null}
                </View>
                <Text style={[styles.tdText, { flex: 1 }]}>{d.predictedBend}°</Text>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.inlineInput}
                    value={d.actualBend?.toString() ?? ''}
                    onChangeText={v => updateActualBend(d.id, v)}
                    placeholder="—"
                    keyboardType="numeric"
                    placeholderTextColor="#aaa"
                  />
                </View>
                <Text style={[styles.tdText, styles.forceText, { flex: 1 }]}>
                  {force !== null ? `${force} N` : '—'}
                </Text>
                <View style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      style={[
                        styles.yesNoBtn,
                        d.wasRight === true && styles.yesNoBtnYes,
                      ]}
                      onPress={() => toggleWasRight(d.id, true)}
                    >
                      <Text style={styles.yesNoText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.yesNoBtn,
                        d.wasRight === false && styles.yesNoBtnNo,
                      ]}
                      onPress={() => toggleWasRight(d.id, false)}
                    >
                      <Text style={styles.yesNoText}>✗</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => deleteDesign(d.id)}>
                    <Text style={styles.deleteText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Force calculation reference */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📐 Force Calculation Reference</Text>
        <Text style={styles.formulaText}>F ≈ k × θ</Text>
        <Text style={styles.formulaDesc}>
          F = force (N) | k = stiffness coefficient | θ = bend angle (radians)
        </Text>
        <View style={styles.kTable}>
          {[
            { mat: 'Thin printer paper', k: '0.05', note: 'Bends very easily' },
            { mat: 'Standard card stock', k: '0.20', note: 'Moderate bend' },
            { mat: 'Thin cardboard', k: '0.50', note: 'Much harder to bend' },
            { mat: 'Corrugated cardboard', k: '2–3', note: 'Very stiff' },
          ].map(row => (
            <View key={row.mat} style={styles.kRow}>
              <Text style={styles.kMat}>{row.mat}</Text>
              <Text style={styles.kVal}>k = {row.k}</Text>
              <Text style={styles.kNote}>{row.note}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Submit */}
      {!submitted ? (
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
      ) : (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✅ Results submitted!</Text>
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

  header: {
    backgroundColor: '#00875a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 18, color: '#c1f0d8', marginBottom: 8 },
  description: { fontSize: 13, color: '#a3e6c8', lineHeight: 20 },

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
    borderLeftColor: '#00875a',
    paddingLeft: 8,
  },

  instructionText: { fontSize: 13, color: '#42526e', marginBottom: 6, lineHeight: 20 },

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
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  inlineInput: {
    borderWidth: 1,
    borderColor: '#dfe1e6',
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
    color: '#172b4d',
    backgroundColor: '#fafbfc',
    width: 60,
  },

  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe1e6',
    alignItems: 'center',
    backgroundColor: '#fafbfc',
  },
  segmentBtnActive: { backgroundColor: '#00875a', borderColor: '#00875a' },
  segmentText: { fontSize: 13, color: '#42526e', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  stiffnessNote: { fontSize: 11, color: '#6b778c', marginBottom: 10, fontStyle: 'italic' },

  button: { borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonAdd: { backgroundColor: '#00875a' },
  buttonSubmit: { backgroundColor: '#6554c0', marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#00875a',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  thCell: { fontSize: 11, color: '#fff', fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f5f7',
    alignItems: 'center',
  },
  tableRowEven: { backgroundColor: '#fafbfc' },
  tdText: { fontSize: 12, color: '#172b4d' },
  tdSubtext: { fontSize: 10, color: '#6b778c', marginTop: 2 },
  tdNote: { fontSize: 10, color: '#0052cc', marginTop: 2, fontStyle: 'italic' },
  forceText: { fontWeight: '700', color: '#00875a' },

  yesNoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dfe1e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoBtnYes: { backgroundColor: '#00875a' },
  yesNoBtnNo: { backgroundColor: '#de350b' },
  yesNoText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  deleteText: { fontSize: 14, marginTop: 4 },

  forceCard: {
    backgroundColor: '#e3fcef',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  forceLabel: { fontSize: 12, color: '#006644' },
  forceValue: { fontSize: 28, fontWeight: 'bold', color: '#006644' },
  forceFormula: { fontSize: 11, color: '#006644', marginTop: 4 },

  formulaText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#172b4d',
    textAlign: 'center',
    marginBottom: 4,
  },
  formulaDesc: { fontSize: 12, color: '#42526e', textAlign: 'center', marginBottom: 12 },

  kTable: { gap: 6 },
  kRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f5f7',
    alignItems: 'center',
  },
  kMat: { flex: 2, fontSize: 12, color: '#172b4d' },
  kVal: { width: 60, fontSize: 12, fontWeight: '700', color: '#00875a' },
  kNote: { flex: 1, fontSize: 11, color: '#6b778c', textAlign: 'right' },

  successBox: {
    backgroundColor: '#e3fcef',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  successText: { color: '#006644', fontWeight: '700', fontSize: 15 },
});
