// src/hooks/useSoundMeter.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

interface SoundMeterState {
  decibels: number;
  isRecording: boolean;
  hasPermission: boolean | null;
}

export function useSoundMeter() {
  const [state, setState] = useState<SoundMeterState>({
    decibels: 0,
    isRecording: false,
    hasPermission: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request microphone permission
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setState(prev => ({ ...prev, hasPermission: status === 'granted' }));
    })();

    return () => {
      stopMeasuring();
    };
  }, []);

  // Convert metering value (-160 to 0 dB) to realistic dB scale (0–140 dB)
  const convertToDecibels = (meteringValue: number): number => {
    // expo-av metering: -160 (silence) to 0 (max)
    // Map to realistic 30–120 dB range for classroom activities
    const normalized = (meteringValue + 160) / 160; // 0 to 1
    return Math.round(30 + normalized * 90);
  };

  const startMeasuring = useCallback(async () => {
    if (!state.hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );

      recordingRef.current = recording;
      setState(prev => ({ ...prev, isRecording: true }));

      // Poll metering every 200ms
      intervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            setState(prev => ({
              ...prev,
              decibels: convertToDecibels(status.metering!),
            }));
          }
        }
      }, 200);
    } catch (error) {
      console.error('Failed to start sound measurement:', error);
    }
  }, [state.hasPermission]);

  const stopMeasuring = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        // Recording may already be stopped
      }
      recordingRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false, decibels: 0 }));
  }, []);

  const captureReading = useCallback((): number => {
    return state.decibels;
  }, [state.decibels]);

  return {
    decibels: state.decibels,
    isRecording: state.isRecording,
    hasPermission: state.hasPermission,
    startMeasuring,
    stopMeasuring,
    captureReading,
  };
}
