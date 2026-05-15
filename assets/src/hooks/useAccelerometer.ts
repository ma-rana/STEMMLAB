// src/hooks/useAccelerometer.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';

interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

interface AccelerometerState {
  data: AccelerometerData;
  magnitude: number;       // overall vibration magnitude
  isActive: boolean;
  hasPermission: boolean | null;
  peakMagnitude: number;   // highest recorded magnitude in session
}

export function useAccelerometer(sampleRate: number = 100) {
  const [state, setState] = useState<AccelerometerState>({
    data: { x: 0, y: 0, z: 0 },
    magnitude: 0,
    isActive: false,
    hasPermission: null,
    peakMagnitude: 0,
  });

  const subscriptionRef = useRef<any>(null);
  const peakRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { status } = await Accelerometer.requestPermissionsAsync();
      setState(prev => ({ ...prev, hasPermission: status === 'granted' }));
    })();
    return () => stop();
  }, []);

  const start = useCallback(() => {
    Accelerometer.setUpdateInterval(sampleRate);
    peakRef.current = 0;

    subscriptionRef.current = Accelerometer.addListener(data => {
      // Magnitude = sqrt(x² + y² + z²), subtract 1g for gravity
      const raw = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      const magnitude = Math.abs(raw - 1); // remove gravity baseline

      if (magnitude > peakRef.current) peakRef.current = magnitude;

      setState(prev => ({
        ...prev,
        data,
        magnitude: Math.round(magnitude * 1000) / 1000,
        isActive: true,
        peakMagnitude: Math.round(peakRef.current * 1000) / 1000,
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

  const resetPeak = useCallback(() => {
    peakRef.current = 0;
    setState(prev => ({ ...prev, peakMagnitude: 0 }));
  }, []);

  return {
    data: state.data,
    magnitude: state.magnitude,
    peakMagnitude: state.peakMagnitude,
    isActive: state.isActive,
    hasPermission: state.hasPermission,
    start,
    stop,
    resetPeak,
  };
}
