import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    subscribeToRequests, 
    subscribeToNearbyRequests, 
    subscribeToMatchingRequests,
    getCompatibleBloodGroups 
} from '../api/firestoreService';
import { triggerLocalNotification } from '../api/notificationService';
import { DonationRequest, UserDocument } from '../types/database';
import { getDistance } from '../api/firestoreService';

export const useDonorRequests = (userData: UserDocument | null, activeHelps: any[]) => {
    const { user } = useAuth();
    const [nearbyRequests, setNearbyRequests] = React.useState<DonationRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = React.useState(true);

    React.useEffect(() => {
        if (!user) return;

        let unsubscribe: () => void = () => { };

        const activeRequestIds = activeHelps.map(m => m.requestId);

        const filterAndEnrichRequests = (requests: DonationRequest[], isGlobal = false) => {
            return requests.filter(r => {
                const isNotMe = r.requesterId !== user?.uid;
                const isNotActive = !activeRequestIds.includes(r.id!);
                let isCompatible = true;
                if (userData?.bloodGroup) {
                    const compatible = getCompatibleBloodGroups(userData.bloodGroup);
                    isCompatible = compatible.includes(r.bloodGroup);
                }

                if (isCompatible && userData?.location?.latitude && r.location?.latitude) {
                    const dist = getDistance(
                        userData.location.latitude,
                        userData.location.longitude,
                        r.location.latitude,
                        r.location.longitude
                    );
                    (r as any).distance = Math.round(dist * 10) / 10;
                }

                return isNotMe && isNotActive && isCompatible;
            });
        };

        if (userData?.location?.latitude && userData?.location?.longitude && userData?.isAvailable && userData?.isEligibleToDonate) {
            unsubscribe = subscribeToNearbyRequests(
                userData.location.latitude,
                userData.location.longitude,
                10,
                userData.bloodGroup || null,
                (requests) => {
                    setNearbyRequests(filterAndEnrichRequests(requests).slice(0, 10));
                    setLoadingRequests(false);
                }
            );
        } else {
            unsubscribe = subscribeToRequests((requests) => {
                setNearbyRequests(filterAndEnrichRequests(requests, true).slice(0, 5));
                setLoadingRequests(false);
            });
        }

        return () => unsubscribe();
    }, [user, userData, activeHelps]);

    // Matching listener for notifications
    React.useEffect(() => {
        if (!userData?.bloodGroup || !userData?.location || !userData?.isEligibleToDonate || !userData?.isAvailable) return;

        const unsubscribeMatching = subscribeToMatchingRequests(
            userData.bloodGroup,
            userData.location.latitude,
            userData.location.longitude,
            (newRequest) => {
                triggerLocalNotification(
                    'Urgent Blood Request!',
                    `A new ${newRequest.bloodGroup} request has been posted nearby.`,
                    newRequest.id
                );
            }
        );

        return () => unsubscribeMatching();
    }, [userData]);

    return { nearbyRequests, loadingRequests };
};
