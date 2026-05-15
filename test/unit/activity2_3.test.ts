// tests/unit/activity2_3.test.ts
// Unit tests for Activity 2 (Sound Pollution) and Activity 3 (Hand Fan)
// Run with: npx jest tests/unit/activity2_3.test.ts

// ─── Activity 2: Sound level risk assessment ───────────────────────────────
function getRiskLevel(db: number): { label: string; color: string } {
  if (db < 30) return { label: 'No risk', color: '#27ae60' };
  if (db < 60) return { label: 'Safe', color: '#2ecc71' };
  if (db < 85) return { label: 'Generally safe', color: '#f1c40f' };
  if (db < 90) return { label: 'Damage possible (long exposure)', color: '#e67e22' };
  if (db < 100) return { label: 'Damage likely (short exposure)', color: '#e74c3c' };
  if (db < 110) return { label: 'Serious damage in minutes', color: '#c0392b' };
  return { label: 'Immediate damage!', color: '#922b21' };
}

// ─── Activity 3: Force calculation ────────────────────────────────────────
const STIFFNESS = { paper: 0.05, cardboard: 0.5 };

function calculateForce(material: 'paper' | 'cardboard', bendDegrees: number): number {
  const k = STIFFNESS[material];
  const thetaRad = (bendDegrees * Math.PI) / 180;
  return Math.round(k * thetaRad * 1000) / 1000;
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Activity 2: Sound Risk Assessment', () => {
  test('whisper (20 dB) → No risk', () => {
    expect(getRiskLevel(20).label).toBe('No risk');
  });

  test('normal conversation (50 dB) → Safe', () => {
    expect(getRiskLevel(50).label).toBe('Safe');
  });

  test('vacuum cleaner (75 dB) → Generally safe', () => {
    expect(getRiskLevel(75).label).toBe('Generally safe');
  });

  test('loud classroom (87 dB) → Damage possible', () => {
    expect(getRiskLevel(87).label).toContain('Damage possible');
  });

  test('motorbike (95 dB) → Damage likely', () => {
    expect(getRiskLevel(95).label).toContain('Damage likely');
  });

  test('rock concert (105 dB) → Serious damage', () => {
    expect(getRiskLevel(105).label).toContain('Serious damage');
  });

  test('explosion (140 dB) → Immediate damage', () => {
    expect(getRiskLevel(140).label).toContain('Immediate damage');
  });

  test('boundary value: exactly 60 dB → Generally safe', () => {
    expect(getRiskLevel(60).label).toBe('Generally safe');
  });

  test('boundary value: exactly 85 dB → Damage possible', () => {
    expect(getRiskLevel(85).label).toContain('Damage possible');
  });
});

describe('Activity 3: Force Calculation (F ≈ k × θ)', () => {
  test('thin paper at 30° → approx 0.026 N', () => {
    const force = calculateForce('paper', 30);
    expect(force).toBeCloseTo(0.026, 2);
  });

  test('cardboard at 30° → approx 0.262 N', () => {
    const force = calculateForce('cardboard', 30);
    expect(force).toBeCloseTo(0.262, 2);
  });

  test('cardboard requires ~10x more force than paper at same angle', () => {
    const paperForce = calculateForce('paper', 30);
    const cardboardForce = calculateForce('cardboard', 30);
    const ratio = cardboardForce / paperForce;
    expect(ratio).toBeCloseTo(10, 0);
  });

  test('0° bend → 0 N force', () => {
    expect(calculateForce('paper', 0)).toBe(0);
    expect(calculateForce('cardboard', 0)).toBe(0);
  });

  test('force increases with bend angle', () => {
    const force15 = calculateForce('paper', 15);
    const force30 = calculateForce('paper', 30);
    const force45 = calculateForce('paper', 45);
    expect(force15).toBeLessThan(force30);
    expect(force30).toBeLessThan(force45);
  });

  test('90° bend paper → approx 0.079 N', () => {
    const force = calculateForce('paper', 90);
    expect(force).toBeCloseTo(0.079, 2);
  });
});
