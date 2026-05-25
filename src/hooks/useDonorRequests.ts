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
import notifee, { AndroidImportance } from '@notifee/react-native';

export const useDonorRequests = (userData: UserDocument | null, loadingUser: boolean, activeHelps: any[]) => {
    const { user } = useAuth();
    const [nearbyRequests, setNearbyRequests] = React.useState<DonationRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = React.useState(true);
    const notifiedRequestIds = React.useRef<Set<string>>(new Set());
    const listenerStartTime = React.useRef<number>(Date.now());

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

        listenerStartTime.current = Date.now();

        const filterAndEnrichRequests = (requests: DonationRequest[], isGlobal = false) => {
            const latestUserData = userDataRef.current;
            const activeRequestIds = activeHelpsRef.current.map(m => m.requestId);

            const filtered = requests.filter(r => {
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

            // Sort by combined score: 60% proximity + 40% recency
            // Urgency (critical/urgent) gets a priority boost on top
            const MAX_DIST_KM = 50;
            const MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours
            const urgencyBoost: Record<string, number> = { critical: 0.3, urgent: 0.15, standard: 0 };
            const now = Date.now();

            filtered.sort((a, b) => {
                const scoreOf = (r: DonationRequest) => {
                    const dist = (r as any).distance ?? MAX_DIST_KM;
                    const distScore = 1 - Math.min(dist / MAX_DIST_KM, 1); // closer = higher

                    const createdAt = (r.createdAt as any)?.toDate
                        ? (r.createdAt as any).toDate().getTime()
                        : (r.createdAt as any) ?? now;
                    const ageMs = Math.max(0, now - createdAt);
                    const ageScore = 1 - Math.min(ageMs / MAX_AGE_MS, 1); // newer = higher

                    const boost = urgencyBoost[r.urgencyLevel] ?? 0;
                    return distScore * 0.6 + ageScore * 0.4 + boost;
                };
                return scoreOf(b) - scoreOf(a); // descending
            });

            return filtered;
        };

        const processAndNotifyRequests = (filteredRequests: DonationRequest[], title: string) => {
            filteredRequests.forEach(r => {
                if (!r.id) return;
                if (notifiedRequestIds.current.has(r.id)) return;

                const createdAt = (r.createdAt as any)?.toDate
                    ? (r.createdAt as any).toDate().getTime()
                    : (r.createdAt as any)?.seconds
                        ? (r.createdAt as any).seconds * 1000
                        : typeof r.createdAt === 'number'
                            ? r.createdAt
                            : null;

                if (createdAt && createdAt > listenerStartTime.current) {
                    notifiedRequestIds.current.add(r.id);
                    notifee.displayNotification({
                        title,
                        body: `A patient needs ${r.bloodGroup} blood at ${r.hospitalName || 'a nearby hospital'}.`,
                        android: {
                            channelId: 'default',
                            importance: AndroidImportance.HIGH,
                            pressAction: {
                                id: 'default',
                            },
                            smallIcon: 'ic_launcher',
                        },
                        data: {
                            requestId: r.id,
                        },
                    }).catch(err => console.error('Failed to display notifee notification:', err));
                } else {
                    notifiedRequestIds.current.add(r.id);
                }
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

                    // Notify for new matching requests
                    processAndNotifyRequests(filtered, 'Urgent Blood Request Nearby');
                }
            );
        } else {
            unsubscribe = subscribeToRequests((requests) => {
                const filtered = filterAndEnrichRequests(requests, true);
                setNearbyRequests(filtered.slice(0, 5));
                setLoadingRequests(false);

                // Notify for new matching requests
                processAndNotifyRequests(filtered, 'Urgent Blood Request');
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
