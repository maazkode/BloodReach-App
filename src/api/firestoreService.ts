import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    getDocs,
    startAt,
    endAt,
    Unsubscribe,
    Timestamp,
    FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { UserDocument, DonationRequest, DonationMatch } from '../types/database';

const db = getFirestore();

// ─── UTILS ─────────────────────────────────────────────

/**
 * Calculates distance between two points in KM.
 */
export const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    return distanceBetween([lat1, lng1], [lat2, lng2]);
};

/**
 * Returns a list of blood groups that a specific donor blood group can donate to.
 */
export const getCompatibleBloodGroups = (donorGroup: string): string[] => {
    const compatibilityMap: Record<string, string[]> = {
        'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        'O+': ['O+', 'A+', 'B+', 'AB+'],
        'A-': ['A-', 'A+', 'AB-', 'AB+'],
        'A+': ['A+', 'AB+'],
        'B-': ['B-', 'B+', 'AB-', 'AB+'],
        'B+': ['B+', 'AB+'],
        'AB-': ['AB-', 'AB+'],
        'AB+': ['AB+'],
    };
    return compatibilityMap[donorGroup] || [donorGroup];
};

// ─── USER SERVICE ─────────────────────────────────────

/**
 * Fetches a user document by UID. 
 * Automatically checks and refreshes eligibility if the cooldown has expired.
 */
export const getUserDocument = async (
    uid: string
): Promise<UserDocument | null> => {
    return checkAndRefreshEligibility(uid);
};

/**
 * Subscribes to real-time updates for a user document.
 */
export const subscribeToUser = (uid: string, callback: (data: UserDocument | null) => void): Unsubscribe => {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data() as UserDocument);
        } else {
            callback(null);
        }
    });
};

/**
 * Creates or updates a user document with production-ready field defaults.
 */
export const createUserDocument = async (
    userData: Partial<UserDocument>
): Promise<void> => {
    if (!userData.uid) throw new Error('UID is required to create a user document');

    try {
        const ref = doc(db, 'users', userData.uid);
        const snap = await getDoc(ref);
        const existingData = snap.data() as UserDocument | undefined;

        const dataToSave: Partial<UserDocument> = {
            ...userData,
            isAvailable: userData.isAvailable ?? (existingData?.isAvailable ?? false),
            roles: userData.roles || (existingData?.roles || ['requester']),
            lastActiveRole: userData.lastActiveRole || (existingData?.lastActiveRole || 'requester'),
            isVerified: userData.isVerified ?? (existingData?.isVerified ?? false),
            isEligibleToDonate: userData.isEligibleToDonate ?? (existingData?.isEligibleToDonate ?? true),
            donationCooldownUntil: userData.donationCooldownUntil !== undefined
                ? userData.donationCooldownUntil
                : (existingData?.donationCooldownUntil ?? null),
            lastDonationDate: userData.lastDonationDate !== undefined
                ? userData.lastDonationDate
                : (existingData?.lastDonationDate ?? null),
            updatedAt: serverTimestamp(),
        };

        // Age Restriction Check (18-60)
        const finalAge = userData.age ?? existingData?.age;
        if (finalAge && (finalAge < 18 || finalAge > 60)) {
            dataToSave.isEligibleToDonate = false;
            dataToSave.isAvailable = false;
            // No cooldown needed if restricted by age
        }

        // ─── GUARANTEED COOLDOWN RE-CALCULATION ───
        const lastDonation = dataToSave.lastDonationDate;
        if (lastDonation) {
            const lastDate = (lastDonation as Timestamp).toDate();
            const now = new Date();
            const cooldownDate = new Date(lastDate);
            cooldownDate.setDate(lastDate.getDate() + 90);

            if (now < cooldownDate) {
                // Still in medical cooldown
                dataToSave.isEligibleToDonate = false;
                dataToSave.isAvailable = false;
                dataToSave.donationCooldownUntil = Timestamp.fromDate(cooldownDate);
                console.log(`[Firestore] Cooldown ACTIVE until: ${cooldownDate.toDateString()}`);
            } else if (!finalAge || (finalAge >= 18 && finalAge <= 60)) {
                // Cooldown expired and age is valid
                dataToSave.isEligibleToDonate = true;
                dataToSave.isAvailable = true;
                dataToSave.donationCooldownUntil = null;
                console.log('[Firestore] Cooldown EXPIRED. User is now ACTIVE.');
            }
        } else {
            // No donation history
            if (!finalAge || (finalAge >= 18 && finalAge <= 60)) {
                dataToSave.isEligibleToDonate = true;
                dataToSave.isAvailable = true;
                dataToSave.donationCooldownUntil = null;
            }
        }

        console.log('[Firestore] Saving Final User State:', {
            uid: userData.uid,
            eligible: dataToSave.isEligibleToDonate,
            available: dataToSave.isAvailable,
            cooldownUntil: dataToSave.donationCooldownUntil?.toDate?.() || null
        });

        if (!snap.exists()) {
            dataToSave.createdAt = serverTimestamp();
        }

        await setDoc(ref, dataToSave, { merge: true });
    } catch (error) {
        console.error('[Firestore] createUserDocument error:', error);
        throw error;
    }
};

/**
 * Updates specific user preferences.
 */
export const updateUserPreferences = async (uid: string, preferences: Partial<UserDocument>): Promise<void> => {
    try {
        await setDoc(doc(db, 'users', uid), {
            ...preferences,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('[Firestore] updateUserPreferences error:', error);
        throw error;
    }
};

// ─── REQUEST SERVICE ─────────────────────────────────

/**
 * Creates a new blood donation request.
 */
export const createDonationRequest = async (
    requestData: Omit<DonationRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, 'requests'), {
            ...requestData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    } catch (error) {
        console.error('[Firestore] createDonationRequest error:', error);
        throw error;
    }
};

/**
 * Saves/Updates the FCM token for the user.
 */
export const saveUserFCMToken = async (uid: string, token: string): Promise<void> => {
    try {
        await setDoc(doc(db, 'users', uid), {
            fcmToken: token,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('[Firestore] saveUserFCMToken error:', error);
    }
};

/**
 * Dynamically updates the user's location in Firestore.
 */
export const updateUserLocation = async (
    uid: string,
    locationData: { latitude: number; longitude: number; geohash: string; address?: string },
    city?: string
): Promise<void> => {
    try {
        const payload: any = {
            location: locationData,
            locationUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        if (city) payload.city = city;

        await setDoc(doc(db, 'users', uid), payload, { merge: true });
    } catch (error) {
        console.error('[Firestore] updateUserLocation error:', error);
        throw error;
    }
};

/**
 * Queues a notification for a specific user.
 */
const queueNotification = async (userId: string, title: string, body: string, data: any = {}) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            toUserId: userId,
            title,
            body,
            data,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('[Firestore] queueNotification error:', error);
    }
};

/**
 * Subscribes to recent open requests for the global dashboard.
 */
export const subscribeToRequests = (
    callback: (requests: DonationRequest[]) => void
): Unsubscribe => {
    const q = query(
        collection(db, 'requests'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(
        q,
        (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
            if (!snapshot) return;
            const requests = snapshot.docs.map(
                (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
                    ({ id: d.id, ...d.data() } as DonationRequest)
            );
            callback(requests);
        },
        (error) => {
            console.error('[Firestore] subscribeToRequests error:', error);
        }
    );
};

/**
 * Subscribes to open requests within a specific radius.
 */
export const subscribeToNearbyRequests = (
    lat: number,
    lng: number,
    radiusKm: number,
    bloodGroup: string | null,
    callback: (requests: DonationRequest[]) => void
): Unsubscribe => {
    const radiusInM = radiusKm * 1000;
    const bounds = geohashQueryBounds([lat, lng], radiusInM);
    const resultsMap = new Map<string, DonationRequest[]>();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerCallback = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(() => {
            const allRequests: DonationRequest[] = [];
            resultsMap.forEach(list => allRequests.push(...list));

            // Remove duplicates (by ID) and sort by proximity or date
            const uniqueRequests = Array.from(new Map(allRequests.map(r => [r.id, r])).values());

            // Sort by distance
            uniqueRequests.sort((a, b) => {
                const distA = getDistance(lat, lng, a.location.latitude, a.location.longitude);
                const distB = getDistance(lat, lng, b.location.latitude, b.location.longitude);
                return distA - distB;
            });

            callback(uniqueRequests);
        }, 100); // 100ms debounce to allow all initial bounds to resolve
    };


    const unsubs = bounds.map((b, index) => {
        let q = query(
            collection(db, 'requests'),
            where('status', '==', 'open'),
            orderBy('location.geohash'),
            startAt(b[0]),
            endAt(b[1])
        );

        if (bloodGroup) {
            // Note: This requires a composite index: status + bloodGroup + location.geohash
            // However, we can also filter client-side if the index isn't ready.
            // Let's stick to client-side filtering for compatibility unless the user wants an index.
        }

        return onSnapshot(q, (snapshot) => {
            if (!snapshot) return;
            const requests = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            } as DonationRequest));

            // Blood Group Compatibility Match
            const filtered = requests.filter((r: DonationRequest) => {
                if (!r.location?.latitude || !r.location?.longitude) return false;

                if (bloodGroup) {
                    const compatibleGroups = getCompatibleBloodGroups(bloodGroup);
                    if (!compatibleGroups.includes(r.bloodGroup)) return false;
                }

                const distance = getDistance(lat, lng, r.location.latitude, r.location.longitude);
                // Attach distance to the request object for UI display
                (r as any).distance = Math.round(distance * 10) / 10;
                return distance <= radiusKm;
            });

            resultsMap.set(`bound_${index}`, filtered);
            triggerCallback();
        });
    });

    return () => unsubs.forEach(u => u());
};

/**
 * Fetches all requests created by a specific user.
 */
export const getRequesterRequests = (
    uid: string,
    callback: (requests: DonationRequest[]) => void
) => {
    try {
        const q = query(
            collection(db, 'requests'),
            where('requesterId', '==', uid)
        );

        return onSnapshot(q,
            (snapshot) => {
                if (!snapshot) {
                    callback([]);
                    return;
                }
                const requests = snapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                } as DonationRequest));

                // Sort client-side to avoid index requirements
                const sorted = requests.sort((a: DonationRequest, b: DonationRequest) => {
                    const timeA = (a.createdAt as any)?.seconds || 0;
                    const timeB = (b.createdAt as any)?.seconds || 0;
                    return timeB - timeA;
                });

                callback(sorted);
            },
            (error) => {
                console.error('[Firestore] getRequesterRequests snapshot error:', error);
                callback([]); // Stop loading even on error
            }
        );
    } catch (error) {
        console.error('[Firestore] getRequesterRequests error:', error);
        callback([]);
        return () => { };
    }
};

// ─── MATCHING ENGINE ─────────────────────────────────

/**
 * A highly optimized proximity-based matching listener.
 * Uses geohash bounds and a timestamp guard to ensure real-time accuracy.
 */
export const subscribeToMatchingRequests = (
    bloodGroup: string,
    lat: number,
    lng: number,
    callback: (req: DonationRequest) => void,
    radiusKm: number = 10
): Unsubscribe => {
    const radiusInM = radiusKm * 1000;
    const bounds = geohashQueryBounds([lat, lng], radiusInM);

    // Capture the exact time the listener starts to skip stale/initial results
    const listenerStartTime = Date.now();

    const unsubs = bounds.map((b) => {
        const q = query(
            collection(db, 'requests'),
            where('status', '==', 'open'),
            where('bloodGroup', '==', bloodGroup),
            orderBy('location.geohash'),
            startAt(b[0]),
            endAt(b[1])
        );

        return onSnapshot(q, (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
            if (!snapshot) return;
            snapshot.docChanges().forEach(
                (change: FirebaseFirestoreTypes.DocumentChange) => {
                    if (change.type === 'added') {
                        const data = change.doc.data() as DonationRequest;

                        if (data.location?.latitude && data.location?.longitude) {
                            const distance = getDistance(
                                lat,
                                lng,
                                data.location.latitude,
                                data.location.longitude
                            );

                            if (distance <= radiusKm) {
                                // Only trigger callback for NEW requests created AFTER the listener started
                                const createdTime = (data.createdAt as any)?.toMillis ? (data.createdAt as any).toMillis() : 0;
                                if (createdTime > listenerStartTime) {
                                    callback({
                                        id: change.doc.id,
                                        ...data,
                                    });
                                }
                            }
                        }
                    }
                }
            );
        });
    });

    return () => unsubs.forEach((u) => u());
};

// ─── DONOR SERVICE ───────────────────────────────────

/**
 * Finds donors within a specific radius and blood group.
 */
export const getNearbyDonors = async ({
    latitude,
    longitude,
    radiusInKm,
    bloodGroup,
}: {
    latitude: number;
    longitude: number;
    radiusInKm: number;
    bloodGroup: string;
}): Promise<any[]> => {
    try {
        const center: [number, number] = [latitude, longitude];
        const radiusInM = radiusInKm * 1000;
        const bounds = geohashQueryBounds(center, radiusInM);

        const promises = bounds.map((b) =>
            getDocs(
                query(
                    collection(db, 'users'),
                    where('roles', 'array-contains', 'donor'),
                    where('isAvailable', '==', true),
                    where('isEligibleToDonate', '==', true),
                    where('bloodGroup', '==', bloodGroup),
                    orderBy('location.geohash'),
                    startAt(b[0]),
                    endAt(b[1])
                )
            )
        );

        const snapshots = await Promise.all(promises);
        const donors: any[] = [];

        snapshots.forEach((snap: FirebaseFirestoreTypes.QuerySnapshot) => {
            snap.docs.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                const data = d.data() as UserDocument;

                if (!data.location?.latitude || !data.location?.longitude) return;

                const distance = getDistance(
                    latitude,
                    longitude,
                    data.location.latitude,
                    data.location.longitude
                );

                if (distance <= radiusInKm) {
                    donors.push({
                        uid: data.uid,
                        name: data.name,
                        phone: data.phone,
                        bloodGroup: data.bloodGroup,
                        distance: Math.round(distance * 10) / 10,
                    });
                }
            });
        });

        return donors.sort((a, b) => a.distance - b.distance);
    } catch (error) {
        console.error('[Firestore] getNearbyDonors error:', error);
        throw error;
    }
};

// ─── DONATION SERVICE ────────────────────────────────

/**
 * Records a donation between a donor and requester.
 */
export const createDonation = async (
    donationData: Omit<DonationMatch, 'id' | 'createdAt'>
): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, 'donations'), {
            ...donationData,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    } catch (error) {
        console.error('[Firestore] createDonation error:', error);
        throw error;
    }
};

/**
 * Creates a new donation match request (Pending)
 */
/**
 * Fetches completed donation stats for a donor.
 */
export const getDonorStats = (
    donorId: string,
    callback: (stats: { count: number; livesSaved: number; rank: string }) => void
) => {
    try {
        const q = query(
            collection(db, 'donation_matches'),
            where('donorId', '==', donorId),
            where('status', '==', 'completed')
        );

        return onSnapshot(q, (snapshot) => {
            const count = snapshot.size;
            const livesSaved = count * 3; // Each donation saves up to 3 lives

            let rank = 'Bronze';
            if (count >= 10) rank = 'Gold';
            else if (count >= 4) rank = 'Silver';

            callback({ count, livesSaved, rank });
        });
    } catch (error) {
        console.error('[Firestore] getDonorStats error:', error);
        return () => { };
    }
};

/**
 * Fetches active matches for a donor (to track ongoing helps).
 */
export const getActiveDonorMatches = (
    donorId: string,
    callback: (matches: (DonationMatch & { request?: DonationRequest })[]) => void
) => {
    try {
        const q = query(
            collection(db, 'donation_matches'),
            where('donorId', '==', donorId),
            where('status', 'not-in', ['completed', 'rejected', 'cancelled'])
        );

        return onSnapshot(q, async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
            if (!snapshot || !snapshot.docs) {
                callback([]);
                return;
            }
            const matches = await Promise.all(snapshot.docs.map(async (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                const match = { id: d.id, ...d.data() } as DonationMatch;
                const requestData = await getDonationRequest(match.requestId);
                return { ...match, request: requestData || undefined };
            }));
            callback(matches as (DonationMatch & { request?: DonationRequest })[]);
        });
    } catch (error) {
        console.error('[Firestore] getActiveDonorMatches error:', error);
        return () => { };
    }
};

/**
 * Fetches historical matches for a donor (completed, rejected, etc.).
 */
export const getDonorHistory = (
    donorId: string,
    callback: (matches: (DonationMatch & { request?: DonationRequest })[]) => void
) => {
    try {
        const q = query(
            collection(db, 'donation_matches'),
            where('donorId', '==', donorId),
            where('status', 'in', ['completed', 'rejected', 'cancelled'])
        );

        return onSnapshot(q, async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
            if (!snapshot || !snapshot.docs) {
                callback([]);
                return;
            }
            const matches = await Promise.all(snapshot.docs.map(async (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                const match = { id: d.id, ...d.data() } as DonationMatch;
                const requestData = await getDonationRequest(match.requestId);
                return { ...match, request: requestData || undefined };
            }));

            // Sort by date descending
            const sorted = matches.sort((a, b) => {
                const timeA = (a.createdAt as any)?.seconds || 0;
                const timeB = (b.createdAt as any)?.seconds || 0;
                return timeB - timeA;
            });

            callback(sorted as (DonationMatch & { request?: DonationRequest })[]);
        });
    } catch (error) {
        console.error('[Firestore] getDonorHistory error:', error);
        return () => { };
    }
};

export const createDonationMatch = async (
    requestId: string,
    donorId: string,
    requesterId: string
): Promise<string> => {
    if (!requestId || !donorId || !requesterId) {
        throw new Error('Invalid match data: IDs are required.');
    }

    if (donorId === requesterId) {
        throw new Error('You cannot donate to your own request.');
    }

    try {
        const [requestData, donorData] = await Promise.all([
            getDonationRequest(requestId),
            getUserDocument(donorId)
        ]);

        if (!requestData || !donorData) {
            throw new Error('Could not verify request or donor information.');
        }

        const compatibleGroups = getCompatibleBloodGroups(donorData.bloodGroup);
        if (!compatibleGroups.includes(requestData.bloodGroup)) {
            throw new Error(`Blood group mismatch. This patient needs ${requestData.bloodGroup}, but your blood group (${donorData.bloodGroup}) can only donate to: ${compatibleGroups.join(', ')}.`);
        }

        // Strict Range Check (10KM)
        if (requestData.location && donorData.location) {
            const distance = getDistance(
                requestData.location.latitude,
                requestData.location.longitude,
                donorData.location.latitude,
                donorData.location.longitude
            );
            if (distance > 10) {
                throw new Error(`Out of range. You must be within 10km to donate to this request (Distance: ${Math.round(distance)}km).`);
            }
        }

        const existingQuery = query(
            collection(db, 'donation_matches'),
            where('requestId', '==', requestId),
            where('donorId', '==', donorId)
        );
        const existingSnapshot = await getDocs(existingQuery);
        if (!existingSnapshot.empty) {
            return existingSnapshot.docs[0].id;
        }

        const matchRef = doc(collection(db, 'donation_matches'));
        const matchData: DonationMatch = {
            requestId,
            donorId,
            requesterId,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        await setDoc(matchRef, matchData);

        // Queue notification for requester
        await queueNotification(
            requesterId,
            'New Donor Interested!',
            `${donorData.name} wants to help with the request for ${requestData.patientName}.`,
            { requestId, type: 'match_request' }
        );

        return matchRef.id;
    } catch (error) {
        console.error('[Firestore] createDonationMatch error:', error);
        throw error;
    }
};

/**
 * Updates the status of a donation match (Accept/Reject)
 */
export const updateMatchStatus = async (
    matchId: string,
    status: 'accepted' | 'rejected' | 'in_progress' | 'failed' | 'cancelled',
    matchData?: DonationMatch
): Promise<void> => {
    try {
        const matchRef = doc(db, 'donation_matches', matchId);
        await setDoc(matchRef, {
            status,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        if (matchData) {
            const [request, donor, requester] = await Promise.all([
                getDonationRequest(matchData.requestId),
                getUserDocument(matchData.donorId),
                getUserDocument(matchData.requesterId)
            ]);

            const patientName = request?.patientName || 'the patient';

            if (status === 'accepted') {
                await queueNotification(
                    matchData.donorId,
                    'Match Accepted!',
                    `${requester?.name || 'Requester'} accepted your offer for ${patientName}. You can now call/WhatsApp them.`,
                    { requestId: matchData.requestId, type: 'match_accepted' }
                );
            } else if (status === 'in_progress') {
                await queueNotification(
                    matchData.donorId,
                    'Donation Started',
                    `The donation process for ${patientName} has officially started.`,
                    { requestId: matchData.requestId, type: 'donation_in_progress' }
                );
                await queueNotification(
                    matchData.requesterId,
                    'Donation Started',
                    `Donor ${donor?.name} has started the donation process.`,
                    { requestId: matchData.requestId, type: 'donation_in_progress' }
                );
            } else if (status === 'failed') {
                await queueNotification(
                    matchData.requesterId,
                    'Donation Update',
                    `The donation attempt with ${donor?.name} was unsuccessful. Your request is still open for others.`,
                    { requestId: matchData.requestId, type: 'donation_failed' }
                );
            } else if (status === 'cancelled') {
                const targetId = matchData.donorId; // Usually notify the other party
                await queueNotification(
                    targetId,
                    'Process Cancelled',
                    'The blood donation process has been cancelled.',
                    { requestId: matchData.requestId, type: 'donation_cancelled' }
                );
            }
        }
    } catch (error) {
        console.error('[Firestore] updateMatchStatus error:', error);
        throw error;
    }
};

/**
 * Get all matches for a specific request (for the requester)
 */
export const getMatchesForRequest = (
    requestId: string,
    callback: (matches: DonationMatch[]) => void
) => {
    return onSnapshot(
        query(collection(db, 'donation_matches'), where('requestId', '==', requestId)),
        (snapshot) => {
            if (!snapshot) return;
            const matches = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as DonationMatch));
            callback(matches);
        }
    );
};

/**
 * Get a specific match between a donor and a request
 */
export const getMatchForDonor = (
    requestId: string,
    donorId: string,
    callback: (match: DonationMatch | null) => void
) => {
    return onSnapshot(
        query(
            collection(db, 'donation_matches'),
            where('requestId', '==', requestId),
            where('donorId', '==', donorId)
        ),
        (snapshot) => {
            if (!snapshot) {
                callback(null);
                return;
            }
            if (snapshot.empty) {
                callback(null);
            } else {
                callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DonationMatch);
            }
        }
    );
};

/**
 * Fetches a single donation request by ID.
 */
export const getDonationRequest = async (requestId: string): Promise<DonationRequest | null> => {
    try {
        const snap = await getDoc(doc(db, 'requests', requestId));
        return snap.exists() ? { id: snap.id, ...snap.data() } as DonationRequest : null;
    } catch (error) {
        console.error('[Firestore] getDonationRequest error:', error);
        throw error;
    }
};

/**
 * Updates a donation request with partial data.
 */
export const updateDonationRequest = async (
    requestId: string,
    data: Partial<DonationRequest>
): Promise<void> => {
    try {
        await setDoc(doc(db, 'requests', requestId), {
            ...data,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('[Firestore] updateDonationRequest error:', error);
        throw error;
    }
};

/**
 * Marks a donation as completed and triggers donor cooldown.
 */
export const completeDonation = async (
    requestId: string,
    donorId: string,
    matchId?: string
): Promise<void> => {
    try {
        const now = new Date();
        const cooldownDate = new Date();
        cooldownDate.setDate(now.getDate() + 90);

        // 1. Mark request as completed
        await setDoc(doc(db, 'requests', requestId), {
            status: 'completed',
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // 2. Update Match status
        if (matchId) {
            await setDoc(doc(db, 'donation_matches', matchId), {
                status: 'completed',
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }

        // 3. Update Donor Cooldown & Availability
        await setDoc(doc(db, 'users', donorId), {
            isAvailable: false,
            isEligibleToDonate: false,
            lastDonationDate: Timestamp.fromDate(now),
            donationCooldownUntil: Timestamp.fromDate(cooldownDate),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        console.log(`Donation completed. Donor ${donorId} now unavailable and on 90-day cooldown.`);
    } catch (error) {
        console.error('[Firestore] completeDonation error:', error);
        throw error;
    }
};

/**
 * Checks if a donor's cooldown has expired and updates their eligibility if needed.
 */
export const checkAndRefreshEligibility = async (uid: string): Promise<UserDocument | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return null;

        const userData = userSnap.data() as UserDocument;

        // If currently not eligible, check if cooldown date has passed
        if (!userData.isEligibleToDonate && userData.donationCooldownUntil) {
            const cooldownDate = (userData.donationCooldownUntil as FirebaseFirestoreTypes.Timestamp).toDate();
            const now = new Date();

            if (now >= cooldownDate) {
                console.log(`Donor ${uid} cooldown expired. Re-enabling eligibility.`);
                await setDoc(userRef, {
                    isEligibleToDonate: true,
                    isAvailable: true,
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                return { ...userData, isEligibleToDonate: true, isAvailable: true };
            }
        }

        return userData;
    } catch (error) {
        console.error('[Firestore] checkAndRefreshEligibility error:', error);
        throw error;
    }
};

export { db };
