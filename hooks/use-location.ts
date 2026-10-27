import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Coordinates } from '../types';

// Location is looked up once per app session and shared by every screen.
let locationPromise: Promise<Coordinates | null> | null = null;

async function lookUpLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch (e) {
    console.warn('Could not get location:', e);
    return null;
  }
}

export function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    let active = true;
    locationPromise ??= lookUpLocation();
    locationPromise.then((loc) => {
      if (active) setLocation(loc);
    });
    return () => { active = false; };
  }, []);

  return { location, permissionGranted: location !== null };
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
