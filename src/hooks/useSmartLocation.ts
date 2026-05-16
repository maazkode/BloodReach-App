import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getFullLocationData } from '../api/locationService';
import { getDistance, updateUserLocation } from '../api/firestoreService';
import { useModal } from '../context/ModalContext';

let lastCheckedTime = 0;
const CHECK_INTERVAL_MS = 1000 * 60 * 30; // 30 minutes
const DISTANCE_THRESHOLD_KM = 15;

export const useSmartLocation = () => {
    const { userData } = useAuth();
    const { showModal } = useModal();
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        // Only run when donor mode is enabled
        if (!userData || !userData.isAvailable || userData.lastActiveRole !== 'donor') {
            return;
        }

        const pref = userData.smartLocationPreference || 'ask';
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

                    const updateLocation = async () => {
                        await updateUserLocation(
                            userData.uid,
                            {
                                latitude: newLoc.latitude,
                                longitude: newLoc.longitude,
                                geohash: newLoc.geohash,
                            },
                            city
                        );
                    };

                    if (pref === 'auto') {
                        await updateLocation();
                        showModal({
                            title: 'Location Updated',
                            description: `We noticed you've travelled. Your location has been automatically updated to show nearby requests.`,
                            type: 'success',
                            primaryText: 'OK'
                        });
                    } else if (pref === 'ask') {
                        showModal({
                            title: 'New Location Detected',
                            description: `You seem to be ${Math.round(distance)}km away from your registered location. Would you like to update your location to see nearby requests?`,
                            type: 'warning',
                            primaryText: 'Update Location',
                            secondaryText: 'Not Now',
                            onPrimaryPress: async () => {
                                try {
                                    await updateLocation();
                                    showModal({
                                        title: 'Updated',
                                        description: 'Location updated successfully. Your request list will refresh automatically.',
                                        type: 'success',
                                        primaryText: 'OK'
                                    });
                                } catch (error) {
                                    showModal({
                                        title: 'Error',
                                        description: 'Failed to update location.',
                                        type: 'error',
                                        primaryText: 'OK'
                                    });
                                }
                            }
                        });
                    }
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
    }, [userData, showModal]);
};
