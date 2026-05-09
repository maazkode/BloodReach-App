import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { BloodRequest, BloodMatch } from '../types/database';
import { getCompatibleBloodGroups } from './firestoreService';

const db = firestore();

/**
 * Utility to safely get time from a Firestore timestamp or serverTimestamp placeholder.
 */
const getSafeTime = (timestamp: any): number => {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    return Date.now();
};

/**
 * Creates a new blood donation request.
 */
export const createBloodRequest = async (
    data: Omit<BloodRequest, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'donorId' | 'acceptedAt' | 'completedAt' | 'cooldownUntil'>
): Promise<string> => {
    try {
        const ref = db.collection('bloodRequests').doc();
        const request: BloodRequest = {
            ...data,
            status: 'active',
            donorId: null,
            acceptedAt: null,
            completedAt: null,
            cooldownUntil: null,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };
        await ref.set(request);
        return ref.id;
    } catch (error) {
        console.error('[BloodRequestService] createBloodRequest error:', error);
        throw error;
    }
};

/**
 * Donor expresses interest.
 */
export const applyForBloodRequest = async (requestId: string, donorId: string, requesterId?: string): Promise<string> => {
    try {
        let finalRequesterId = requesterId;

        // Fetch both Request and Donor documents to verify compatibility
        const [reqDoc, donorDoc] = await Promise.all([
            db.collection('bloodRequests').doc(requestId).get(),
            db.collection('users').doc(donorId).get()
        ]);

        if (!reqDoc.exists) throw new Error('Request not found');
        if (!donorDoc.exists) throw new Error('Donor information not found');

        const requestData = reqDoc.data() as BloodRequest;
        const donorData = donorDoc.data() as any; // UserDocument

        // 1. Blood Compatibility Check
        const compatibleGroups = getCompatibleBloodGroups(donorData.bloodGroup);
        if (!compatibleGroups.includes(requestData.bloodGroup)) {
            throw new Error(`Blood group mismatch. This patient needs ${requestData.bloodGroup}, but your blood group (${donorData.bloodGroup}) can only donate to: ${compatibleGroups.join(', ')}.`);
        }

        if (!finalRequesterId) {
            finalRequesterId = requestData.requesterId;
        }

        const matches = await db.collection('bloodMatches')
            .where('requestId', '==', requestId)
            .where('donorId', '==', donorId)
            .get();
        
        if (!matches.empty) {
            return matches.docs[0].id;
        }
        
        const matchRef = db.collection('bloodMatches').doc();
        const matchData: BloodMatch = {
            requestId,
            donorId,
            requesterId: finalRequesterId!,
            status: 'pending',
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };
        
        await matchRef.set(matchData);
        return matchRef.id;
    } catch (error) {
        console.error('[BloodRequestService] applyForBloodRequest error:', error);
        throw error;
    }
};

/**
 * Requester accepts a match.
 */
export const acceptBloodMatch = async (matchId: string): Promise<void> => {
    try {
        const matchRef = db.collection('bloodMatches').doc(matchId);

        await db.runTransaction(async (transaction) => {
            const matchSnap = await transaction.get(matchRef);
            if (!matchSnap.exists) throw new Error('Match not found');
            
            const matchData = matchSnap.data() as BloodMatch;
            const requestRef = db.collection('bloodRequests').doc(matchData.requestId);
            const requestSnap = await transaction.get(requestRef);
            
            if (!requestSnap.exists) throw new Error('Request not found');
            const requestData = requestSnap.data() as BloodRequest;

            if (requestData.status !== 'active') {
                throw new Error('Request is no longer active.');
            }

            transaction.update(requestRef, {
                status: 'matched',
                donorId: matchData.donorId,
                acceptedAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });

            transaction.update(matchRef, {
                status: 'accepted',
                acceptedAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        });
    } catch (error) {
        console.error('[BloodRequestService] acceptBloodMatch error:', error);
        throw error;
    }
};

/**
 * Confirms donation from either donor or requester side.
 * When both confirm, the request is automatically marked as completed.
 */
export const confirmDonation = async (
    matchId: string, 
    role: 'donor' | 'requester',
    didHappen: boolean
): Promise<void> => {
    try {
        const matchRef = db.collection('bloodMatches').doc(matchId);
        
        await db.runTransaction(async (transaction) => {
            const matchSnap = await transaction.get(matchRef);
            if (!matchSnap.exists) throw new Error('Match not found');
            const matchData = matchSnap.data() as BloodMatch;

            const updates: Partial<BloodMatch> = {
                updatedAt: firestore.FieldValue.serverTimestamp()
            };

            if (role === 'donor') {
                updates.donorConfirmed = didHappen;
                updates.donorConfirmedAt = firestore.FieldValue.serverTimestamp();
            } else {
                updates.requesterConfirmed = didHappen;
                updates.requesterConfirmedAt = firestore.FieldValue.serverTimestamp();
            }

            transaction.update(matchRef, updates);

            // Check if both confirmed YES
            const isDonorConfirmed = role === 'donor' ? didHappen : (matchData.donorConfirmed === true);
            const isRequesterConfirmed = role === 'requester' ? didHappen : (matchData.requesterConfirmed === true);

            if (isDonorConfirmed && isRequesterConfirmed) {
                // Trigger auto-completion in separate logic or here?
                // For safety, we can call completeBloodRequest after the transaction or inside if we are careful.
                // But inside transaction is better for atomicity.
            }
        });

        // After transaction, check if we should complete
        const finalSnap = await matchRef.get();
        const finalData = finalSnap.data() as BloodMatch;
        
        if (finalData.donorConfirmed && finalData.requesterConfirmed) {
            await completeBloodRequest(finalData.requestId);
        }
    } catch (error) {
        console.error('[BloodRequestService] confirmDonation error:', error);
        throw error;
    }
};

/**
 * Completes donation.
 */
export const completeBloodRequest = async (requestId: string): Promise<void> => {
    try {
        const requestRef = db.collection('bloodRequests').doc(requestId);
        const requestSnap = await requestRef.get();
        
        if (!requestSnap.exists) throw new Error('Request not found');
        const data = requestSnap.data() as BloodRequest;
        
        if (data.status !== 'matched') throw new Error('Request is not in matched state');
        if (!data.donorId) throw new Error('Donor ID is missing');

        const matchSnaps = await db.collection('bloodMatches')
            .where('requestId', '==', requestId)
            .where('donorId', '==', data.donorId)
            .where('status', '==', 'accepted')
            .limit(1)
            .get();

        await db.runTransaction(async (transaction) => {
            const freshReq = await transaction.get(requestRef);
            if (!freshReq.exists || freshReq.data()?.status !== 'matched') {
                throw new Error('Request state changed during processing');
            }

            const now = new Date();
            const cooldownDate = new Date();
            cooldownDate.setDate(now.getDate() + 90);

            transaction.update(requestRef, {
                status: 'completed',
                completedAt: firestore.FieldValue.serverTimestamp(),
                cooldownUntil: firestore.Timestamp.fromDate(cooldownDate),
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });

            matchSnaps.forEach(m => {
                transaction.update(m.ref, { status: 'completed', updatedAt: firestore.FieldValue.serverTimestamp() });
            });

            const donorRef = db.collection('users').doc(data.donorId!);
            transaction.update(donorRef, {
                isEligibleToDonate: false,
                isAvailable: false,
                lastDonationDate: firestore.FieldValue.serverTimestamp(),
                donationCooldownUntil: firestore.Timestamp.fromDate(cooldownDate),
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        });
    } catch (error) {
        console.error('[BloodRequestService] completeBloodRequest error:', error);
        throw error;
    }
};

/**
 * Requester cancels request.
 */
export const cancelBloodRequest = async (requestId: string): Promise<void> => {
    try {
        const requestRef = db.collection('bloodRequests').doc(requestId);
        await requestRef.set({
            status: 'cancelled',
            updatedAt: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('[BloodRequestService] cancelBloodRequest error:', error);
        throw error;
    }
};

/**
 * Reverts a match to active.
 */
export const releaseBloodRequest = async (requestId: string): Promise<void> => {
    try {
        const requestRef = db.collection('bloodRequests').doc(requestId);
        const requestSnap = await requestRef.get();
        
        if (!requestSnap.exists) throw new Error('Request not found');
        const data = requestSnap.data() as BloodRequest;
        
        if (data.status !== 'matched') throw new Error('Only matched requests can be released');
        if (!data.donorId) throw new Error('Donor ID is missing');

        const matchSnaps = await db.collection('bloodMatches')
            .where('requestId', '==', requestId)
            .where('donorId', '==', data.donorId)
            .where('status', '==', 'accepted')
            .limit(1)
            .get();

        await db.runTransaction(async (transaction) => {
            const freshReq = await transaction.get(requestRef);
            if (!freshReq.exists || freshReq.data()?.status !== 'matched') {
                throw new Error('Request state changed during processing');
            }

            transaction.update(requestRef, {
                status: 'active',
                donorId: null,
                acceptedAt: null,
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });

            matchSnaps.forEach(m => {
                transaction.update(m.ref, { status: 'cancelled', updatedAt: firestore.FieldValue.serverTimestamp() });
            });
        });
    } catch (error) {
        console.error('[BloodRequestService] releaseBloodRequest error:', error);
        throw error;
    }
};

/**
 * Subscriptions
 */
export const subscribeToMatchesForRequest = (
    requestId: string,
    callback: (matches: BloodMatch[]) => void
): () => void => {
    return db.collection('bloodMatches')
        .where('requestId', '==', requestId)
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            const matches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BloodMatch));
            
            const sorted = matches.sort((a, b) => getSafeTime(b.createdAt) - getSafeTime(a.createdAt));
            callback(sorted);
        }, (err) => console.error('[BloodRequestService] subscribeToMatchesForRequest error:', err));
};

export const subscribeToActiveRequests = (
    callback: (requests: BloodRequest[]) => void
): () => void => {
    return db.collection('bloodRequests')
        .where('status', '==', 'active')
        .onSnapshot((snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BloodRequest));
            
            const sorted = requests.sort((a, b) => getSafeTime(b.createdAt) - getSafeTime(a.createdAt));
            callback(sorted);
        }, (err) => console.error('[BloodRequestService] subscribeToActiveRequests error:', err));
};

export const subscribeToNearbyBloodRequests = (
    lat: number,
    lng: number,
    radiusKm: number,
    callback: (requests: BloodRequest[]) => void
): () => void => {
    const radiusInM = radiusKm * 1000;
    const bounds = geohashQueryBounds([lat, lng], radiusInM);
    const resultsMap = new Map<string, BloodRequest[]>();

    const triggerCallback = () => {
        const all: BloodRequest[] = [];
        resultsMap.forEach(list => all.push(...list));
        
        const unique = Array.from(new Map(all.map(r => [r.id, r])).values());
        unique.sort((a, b) => {
            const distA = distanceBetween([lat, lng], [a.location.latitude, a.location.longitude]);
            const distB = distanceBetween([lat, lng], [b.location.latitude, b.location.longitude]);
            return distA - distB;
        });

        callback(unique);
    };

    const unsubs = bounds.map((b, index) => {
        return db.collection('bloodRequests')
            .where('status', '==', 'active')
            .orderBy('location.geohash')
            .startAt(b[0])
            .endAt(b[1])
            .onSnapshot((snapshot) => {
                const requests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as BloodRequest));

                const filtered = requests.filter(r => {
                    const dist = distanceBetween([lat, lng], [r.location.latitude, r.location.longitude]);
                    return dist <= radiusKm;
                });

                resultsMap.set(`bound_${index}`, filtered);
                triggerCallback();
            }, (err) => console.error('[BloodRequestService] subscribeToNearbyBloodRequests error:', err));
    });

    return () => unsubs.forEach(u => u());
};

/**
 * Subscribes to active (accepted but not completed) matches for a specific user role.
 */
export const subscribeToActiveMatches = (
    userId: string,
    role: 'donor' | 'requester',
    callback: (matches: BloodMatch[]) => void
): () => void => {
    const userField = role === 'donor' ? 'donorId' : 'requesterId';
    return db.collection('bloodMatches')
        .where(userField, '==', userId)
        .where('status', '==', 'accepted')
        .onSnapshot((snapshot) => {
            const matches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BloodMatch));
            callback(matches);
        }, (err) => console.error(`[BloodRequestService] subscribeToActiveMatches (${role}) error:`, err));
};
