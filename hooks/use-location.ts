import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Coordinates } from '../types';

export function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        setPermissionGranted(true);
        Location.getCurrentPositionAsync({}).then((loc) => {
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        });
      }
    });
  }, []);

  return { location, permissionGranted };
}

export function getDistanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
