import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getFullLocationData } from '../api/locationService';
import { getDistance, updateUserLocation } from '../api/firestoreService';

let lastCheckedTime = 0;
const CHECK_INTERVAL_MS = 1000 * 60 * 30; // 30 minutes
const DISTANCE_THRESHOLD_KM = 15;

export const useSmartLocation = () => {
    const { userData } = useAuth();
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        // Only run when donor mode is enabled
        if (!userData || !userData.isAvailable || userData.lastActiveRole !== 'donor') {
            return;
        }

        const pref = userData.smartLocationPreference || 'auto';
        if (pref === 'off') return;

        const checkLocation = async () => {
            const now = Date.now();
            if (now - lastCheckedTime < CHECK_INTERVAL_MS) return;

            try {
                // Temporarily mark as checked to prevent overlapping calls
                lastCheckedTime = now;

                const newLoc = await getFullLocationData();
                if (!userData.location?.latitude || !userData.location?.longitude) return;

                const distance = getDistance(
                    userData.location.latitude,
                    userData.location.longitude,
                    newLoc.latitude,
                    newLoc.longitude
                );

                if (distance > DISTANCE_THRESHOLD_KM) {
                    const city = newLoc.address?.split(',')[0].trim() || userData.city;
                    const address = newLoc.address || userData.address;

                    const updateLocation = async () => {
                        await updateUserLocation(
                            userData.uid,
                            {
                                latitude: newLoc.latitude,
                                longitude: newLoc.longitude,
                                geohash: newLoc.geohash,
                            },
                            city,
                            address
                        );
                    };

                    // Silently update location without showing any modals
                    await updateLocation();
                }
            } catch (error) {
                console.error('[SmartLocation] Check failed:', error);
                // Revert checked time on error so it can retry sooner
                lastCheckedTime = 0;
            }
        };

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                checkLocation();
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Also run once on mount
        checkLocation();

        return () => {
            subscription.remove();
        };
    }, [userData]);
};
