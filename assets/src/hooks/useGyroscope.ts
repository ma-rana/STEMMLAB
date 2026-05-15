// src/hooks/useGyroscope.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Gyroscope } from 'expo-sensors';

interface GyroscopeData {
  x: number;
  y: number;
  z: number;
}

interface GyroscopeState {
  data: GyroscopeData;
  rotationRate: number;     // overall rotation speed (rad/s)
  smoothness: number;       // 0–100 score (higher = smoother)
  isActive: boolean;
  hasPermission: boolean | null;
}

export function useGyroscope(sampleRate: number = 100) {
  const [state, setState] = useState<GyroscopeState>({
    data: { x: 0, y: 0, z: 0 },
    rotationRate: 0,
    smoothness: 100,
    isActive: false,
    hasPermission: null,
  });

  const subscriptionRef = useRef<any>(null);
  const prevRateRef = useRef(0);
  const smoothnessWindowRef = useRef<number[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Gyroscope.requestPermissionsAsync();
      setState(prev => ({ ...prev, hasPermission: status === 'granted' }));
    })();
    return () => stop();
  }, []);

  const start = useCallback(() => {
    Gyroscope.setUpdateInterval(sampleRate);
    prevRateRef.current = 0;
    smoothnessWindowRef.current = [];

    subscriptionRef.current = Gyroscope.addListener(data => {
      const rate = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      const roundedRate = Math.round(rate * 1000) / 1000;

      // Smoothness: measure jerk (rate of change of rotation)
      const jerk = Math.abs(rate - prevRateRef.current);
      prevRateRef.current = rate;

      // Rolling window of last 10 jerk values
      const window = smoothnessWindowRef.current;
      window.push(jerk);
      if (window.length > 10) window.shift();

      const avgJerk = window.reduce((a, b) => a + b, 0) / window.length;
      // Map avgJerk to smoothness score: 0 jerk = 100, 2+ jerk = 0
      const smoothness = Math.max(0, Math.round(100 - (avgJerk / 2) * 100));

      setState(prev => ({
        ...prev,
        data,
        rotationRate: roundedRate,
        smoothness,
        isActive: true,
      }));
    });
  }, [sampleRate]);

  const stop = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setState(prev => ({ ...prev, isActive: false }));
  }, []);

  return {
    data: state.data,
    rotationRate: state.rotationRate,
    smoothness: state.smoothness,
    isActive: state.isActive,
    hasPermission: state.hasPermission,
    start,
    stop,
  };
}
