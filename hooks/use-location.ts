import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { Coordinates } from '../types';

// Location is shared by every screen. It's looked up when first needed and again
// whenever the app comes back to the foreground after a while, because iOS can
// keep the app open for days (e.g. across a trip).
const MAX_AGE_MS = 5 * 60 * 1000;

let current: Coordinates | null = null;
let lookedUpAt = 0;
let pending: Promise<void> | null = null;
const listeners = new Set<(location: Coordinates) => void>();

async function lookUpLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc =
      (await Location.getLastKnownPositionAsync({ maxAge: MAX_AGE_MS })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch (e) {
    console.warn('Could not get location:', e);
    return null;
  }
}

function refreshIfStale() {
  if (pending || Date.now() - lookedUpAt < MAX_AGE_MS) return;
  pending = lookUpLocation()
    .then((loc) => {
      lookedUpAt = Date.now();
      if (!loc) return;
      current = loc;
      listeners.forEach((listener) => listener(loc));
    })
    .finally(() => { pending = null; });
}

AppState.addEventListener('change', (state) => {
  if (state === 'active' && listeners.size > 0) refreshIfStale();
});

export function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(current);

  useEffect(() => {
    listeners.add(setLocation);
    if (current) setLocation(current);
    refreshIfStale();
    return () => { listeners.delete(setLocation); };
  }, []);

  return { location };
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

/** Distance to a restaurant in km, or null if either location is unknown. */
export function distanceTo(userLocation: Coordinates | null, place: { lat: number | null; lng: number | null }): number | null {
  if (!userLocation || place.lat == null || place.lng == null) return null;
  return getDistanceKm(userLocation, { latitude: place.lat, longitude: place.lng });
}

/** Sort comparator for distances; places without a known distance always go last. */
export function compareDistance(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction * (a - b);
}
