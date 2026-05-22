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

    // Store userData in a ref so the AppState listener always has the latest
    // values without being re-registered on every Firestore snapshot.
    const userDataRef = useRef(userData);
    useEffect(() => {
        userDataRef.current = userData;
    }, [userData]);

    useEffect(() => {
        const checkLocation = async () => {
            const current = userDataRef.current;

            // Guard: only run for active, available donors
            if (!current || !current.isAvailable || current.lastActiveRole !== 'donor') return;

            const pref = current.smartLocationPreference || 'auto';
            if (pref === 'off') return;

            // Throttle — skip if checked recently
            const now = Date.now();
            if (now - lastCheckedTime < CHECK_INTERVAL_MS) return;

            // Mark attempted before the async call to prevent overlapping runs
            lastCheckedTime = now;

            try {
                const newLoc = await getFullLocationData();

                if (!current.location?.latitude || !current.location?.longitude) return;

                const distance = getDistance(
                    current.location.latitude,
                    current.location.longitude,
                    newLoc.latitude,
                    newLoc.longitude
                );

                if (distance > DISTANCE_THRESHOLD_KM) {
                    const city = newLoc.address?.split(',')[0].trim() || current.city;
                    const address = newLoc.address || current.address;

                    await updateUserLocation(
                        current.uid,
                        {
                            latitude: newLoc.latitude,
                            longitude: newLoc.longitude,
                            geohash: newLoc.geohash,
                        },
                        city,
                        address
                    );
                    console.log('[SmartLocation] Location updated — moved', distance.toFixed(1), 'km');
                }
            } catch (error: any) {
                // Log a meaningful message based on the error type
                const reason = error?.message || error?.code || 'Unknown error';
                console.warn('[SmartLocation] Check skipped:', reason);
                // Revert so it retries sooner on the next app resume
                lastCheckedTime = 0;
            }
        };

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                checkLocation();
            }
            appState.current = nextAppState;
        };

        const appState = { current: AppState.currentState };
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Run once on mount
        checkLocation();

        return () => {
            subscription.remove();
        };

        // Empty deps: the effect is set up ONCE. The AppState listener always
        // reads the latest userData via userDataRef — no re-registration needed.
    }, []);
};
