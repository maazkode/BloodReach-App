import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { geohashForLocation } from 'geofire-common';

export interface LocationData {
    latitude: number;
    longitude: number;
    geohash: string;
    address: string;
}

/**
 * Requests location permissions for Android and iOS
 */
export const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        return auth === 'granted';
    }

    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'BloodReach Location Permission',
                message: 'BloodReach needs access to your location to find donors and requests nearby.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
};

/**
 * Gets the current GPS coordinates
 */
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                resolve({ latitude, longitude });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
            }
        );
    });
};

/**
 * Converts coordinates to a human-readable address using Nominatim (OpenStreetMap)
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
                headers: {
                    'User-Agent': 'BloodReachApp/1.0',
                },
            }
        );
        const data = await response.json();
        return data.display_name || 'Address not found';
    } catch (error) {
        console.error('Reverse Geocoding Error:', error);
        return 'Unknown Location';
    }
};

/**
 * Combines everything: Permission -> GPS -> Geohash -> Address
 */
export const getFullLocationData = async (): Promise<LocationData> => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
        throw new Error('Location permission denied');
    }

    const coords = await getCurrentLocation();
    const hash = geohashForLocation([coords.latitude, coords.longitude]);
    const address = await reverseGeocode(coords.latitude, coords.longitude);

    return {
        ...coords,
        geohash: hash,
        address,
    };
};

/**
 * Converts an address string into coordinates using Nominatim
 */
export const forwardGeocode = async (address: string): Promise<{ latitude: number, longitude: number, address: string } | null> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
            {
                headers: {
                    'User-Agent': 'BloodReachApp/1.0',
                },
            }
        );
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                address: data[0].display_name,
            };
        }
        return null;
    } catch (error) {
        console.error('Forward Geocoding Error:', error);
        return null;
    }
};
