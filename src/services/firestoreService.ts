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
import { UserDocument, DonationRequest, Donation } from '../types/database';

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
 * Creates or updates a user document with production-ready field defaults.
 */
export const createUserDocument = async (
    userData: Partial<UserDocument>
): Promise<void> => {
    if (!userData.uid) throw new Error('UID is required to create a user document');

    try {
        const ref = doc(db, 'users', userData.uid);
        const snap = await getDoc(ref);

        const dataToSave: Partial<UserDocument> = {
            ...userData,
            isAvailable: userData.isAvailable ?? false,
            roles: userData.roles || ['requester'],
            lastActiveRole: userData.lastActiveRole || 'requester',
            isVerified: userData.isVerified || false,
            isEligibleToDonate: userData.isEligibleToDonate ?? true,
            donationCooldownUntil: userData.donationCooldownUntil || null,
            lastDonationDate: userData.lastDonationDate || null,
            updatedAt: serverTimestamp(),
        };

        if (!snap.exists()) {
            dataToSave.createdAt = serverTimestamp();
        }

        await setDoc(ref, dataToSave, { merge: true });
    } catch (error) {
        console.error('[Firestore] createUserDocument error:', error);
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
                        
                        // Production-grade initial result skip:
                        // Convert Firestore timestamp to millis and compare to listener start time
                        const createdAt = (data.createdAt as any)?.toMillis?.() || 0;
                        if (createdAt < listenerStartTime - 5000) {
                            // Skip if request was created more than 5 seconds before subscription
                            return;
                        }

                        if (data.location?.latitude && data.location?.longitude) {
                            const distance = getDistance(
                                lat,
                                lng,
                                data.location.latitude,
                                data.location.longitude
                            );

                            if (distance <= radiusKm) {
                                callback({
                                    id: change.doc.id,
                                    ...data,
                                });
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
    donationData: Omit<Donation, 'id' | 'createdAt'>
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
 * Completes a donation and sets the donor's 3-month cooldown.
 */
export const completeDonation = async (
    donationId: string,
    donorId: string,
    requestId: string
): Promise<void> => {
    try {
        const now = new Date();
        const cooldownDate = new Date();
        cooldownDate.setDate(now.getDate() + 90); // 90 days cooldown

        // 1. Update Donation Status
        await setDoc(doc(db, 'donations', donationId), {
            status: 'completed',
            donationDate: Timestamp.fromDate(now),
        }, { merge: true });

        // 2. Update Request Status
        await setDoc(doc(db, 'requests', requestId), {
            status: 'completed',
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // 3. Update Donor Cooldown
        await setDoc(doc(db, 'users', donorId), {
            isAvailable: false,
            isEligibleToDonate: false,
            lastDonationDate: Timestamp.fromDate(now),
            donationCooldownUntil: Timestamp.fromDate(cooldownDate),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        console.log(`Donation ${donationId} completed. Donor ${donorId} on cooldown until ${cooldownDate.toDateString()}`);
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
