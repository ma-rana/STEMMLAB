// src/hooks/useLocation.ts
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    hasPermission: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setState(prev => ({ ...prev, hasPermission: status === 'granted' }));
    })();
  }, []);

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!state.hasPermission) {
      setState(prev => ({ ...prev, error: 'Location permission not granted' }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setState(prev => ({
        ...prev,
        ...coords,
        isLoading: false,
      }));

      return coords;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to get location',
      }));
      return null;
    }
  };

  return {
    latitude: state.latitude,
    longitude: state.longitude,
    hasPermission: state.hasPermission,
    isLoading: state.isLoading,
    error: state.error,
    getCurrentLocation,
  };
}
