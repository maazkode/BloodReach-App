import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
    subscribeToRequests,
    subscribeToNearbyRequests,
    subscribeToMatchingRequests,
    getCompatibleBloodGroups,
    getDistance,
} from '../api/firestoreService';
import { triggerLocalNotification } from '../api/notificationService';
import { DonationRequest, UserDocument } from '../types/database';

export const useDonorRequests = (userData: UserDocument | null, loadingUser: boolean, activeHelps: any[]) => {
    const { user } = useAuth();
    const [nearbyRequests, setNearbyRequests] = React.useState<DonationRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = React.useState(true);

    // ── Extract only the primitives that determine WHICH query to run ─────────
    const lat = userData?.location?.latitude ?? null;
    const lng = userData?.location?.longitude ?? null;
    const bloodGroup = userData?.bloodGroup ?? null;
    const isAvailable = userData?.isAvailable ?? false;
    const isEligible = userData?.isEligibleToDonate ?? false;

    // Ref-based access for mutable values used only inside the callback.
    // This prevents the subscription effect from re-running when these change.
    const userDataRef = React.useRef(userData);
    const activeHelpsRef = React.useRef(activeHelps);
    React.useEffect(() => { userDataRef.current = userData; }, [userData]);
    React.useEffect(() => { activeHelpsRef.current = activeHelps; }, [activeHelps]);

    // ── Main subscription effect ──────────────────────────────────────────────
    // Deps are ONLY primitives that change the query itself, NOT the full object.
    React.useEffect(() => {
        if (!user || loadingUser) return;

        let unsubscribe: () => void = () => { };

        const filterAndEnrichRequests = (requests: DonationRequest[], isGlobal = false) => {
            const latestUserData = userDataRef.current;
            const activeRequestIds = activeHelpsRef.current.map(m => m.requestId);

            return requests.filter(r => {
                const isNotMe = r.requesterId !== user?.uid;
                const isNotActive = !activeRequestIds.includes(r.id!);
                let isCompatible = true;
                if (latestUserData?.bloodGroup) {
                    const compatible = getCompatibleBloodGroups(latestUserData.bloodGroup);
                    isCompatible = compatible.includes(r.bloodGroup);
                }

                if (isCompatible && latestUserData?.location?.latitude && r.location?.latitude) {
                    const dist = getDistance(
                        latestUserData.location.latitude,
                        latestUserData.location.longitude,
                        r.location.latitude,
                        r.location.longitude
                    );
                    (r as any).distance = Math.round(dist * 10) / 10;

                    if (isGlobal && dist > 50) return false;
                }

                return isNotMe && isNotActive && isCompatible;
            });
        };

        if (lat && lng && isAvailable && isEligible) {
            unsubscribe = subscribeToNearbyRequests(
                lat,
                lng,
                10,
                bloodGroup,
                (requests) => {
                    const filtered = filterAndEnrichRequests(requests);
                    setNearbyRequests(filtered.slice(0, 10));
                    setLoadingRequests(false);
                }
            );
        } else {
            unsubscribe = subscribeToRequests((requests) => {
                const filtered = filterAndEnrichRequests(requests, true);
                setNearbyRequests(filtered.slice(0, 5));
                setLoadingRequests(false);
            });
        }

        return () => unsubscribe();

        // Only primitives here — object refs (userDataRef/activeHelpsRef) are
        // always up-to-date via the sync effects above, no churn needed.
    }, [user, loadingUser, lat, lng, bloodGroup, isAvailable, isEligible]);

    // ── Matching notification listener ────────────────────────────────────────
    // Same pattern: depend only on primitive flags, not the full userData object.
    React.useEffect(() => {
        if (!bloodGroup || !lat || !lng || !isEligible || !isAvailable) return;

        const unsubscribeMatching = subscribeToMatchingRequests(
            bloodGroup,
            lat,
            lng,
            (newRequest) => {
                triggerLocalNotification(
                    'Urgent Blood Request!',
                    `A new ${newRequest.bloodGroup} request has been posted nearby.`,
                    newRequest.id
                );
            }
        );

        return () => unsubscribeMatching();
    }, [bloodGroup, lat, lng, isEligible, isAvailable]);

    return { nearbyRequests, loadingRequests };
};
