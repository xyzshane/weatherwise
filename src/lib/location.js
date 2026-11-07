import * as Location from 'expo-location';

// City Hall. Used when location is off, or when the device is outside
// Singapore (the Android emulator defaults to California).
export const CENTRAL = { latitude: 1.2931, longitude: 103.852 };

const inSingapore = ({ latitude, longitude }) =>
  latitude > 1.15 && latitude < 1.48 && longitude > 103.6 && longitude < 104.1;

export async function getHere() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ...CENTRAL, fallback: true };
    let pos;
    try {
      pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    } catch {
      // No fresh fix (e.g. GPS off): only trust a cached position from the last 10 minutes.
      pos = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    }
    if (!pos) return { ...CENTRAL, fallback: true };
    const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    return inSingapore(here) ? here : { ...CENTRAL, fallback: true };
  } catch {
    return { ...CENTRAL, fallback: true };
  }
}
