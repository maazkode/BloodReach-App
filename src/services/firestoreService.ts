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
    endAt
} from '@react-native-firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { UserDocument, DonationRequest, Donation } from '../types/database';

/**
 * Initialize Firestore instance
 */
const db = getFirestore();

/**
 * Checks if a user document exists in Firestore using UID.
 * @param uid - Firebase Auth UID
 * @returns Promise<boolean>
 */
export const checkUserExists = async (uid: string): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        return userSnap.exists();
    } catch (error) {
        console.error('Error checking user existence:', error);
        throw error;
    }
};

/**
 * Fetches a user document from Firestore.
 * @param uid - Firebase Auth UID
 * @returns Promise<UserDocument | null>
 */
export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return userSnap.data() as UserDocument;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user document:', error);
        throw error;
    }
};

/**
 * Creates or updates a user document in the "users" collection.
 * @param userData - Partial user data to save
 */
export const createUserDocument = async (userData: Partial<UserDocument>): Promise<void> => {
    if (!userData.uid) throw new Error('UID is required to create a user document');

    try {
        const userRef = doc(db, 'users', userData.uid);

        const finalData = {
            ...userData,
            isAvailable: userData.isAvailable ?? false,
            roles: userData.roles || ['requester'],
            lastActiveRole: userData.lastActiveRole || 'requester',
            lastDonationDate: userData.lastDonationDate || null,
            isVerified: userData.isVerified || false,
            updatedAt: serverTimestamp(),
        };

        // If it's the first time creating, we should ensure createdAt is set
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            (finalData as any).createdAt = serverTimestamp();
        }

        await setDoc(userRef, finalData, { merge: true });
        console.log('User document saved successfully');
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
};

/**
 * Creates a new blood request in the "requests" collection.
 * @param requestData - Donation request data
 */
export const createDonationRequest = async (requestData: Omit<DonationRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
        const colRef = collection(db, 'requests');
        const docRef = await addDoc(colRef, {
            ...requestData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        } as any);
        return docRef.id;
    } catch (error) {
        console.error('Error creating request:', error);
        throw error;
    }
};

/**
 * Listens for real-time updates on blood donation requests.
 * @param callback - Function to handle the requests list updates
 * @returns Unsubscribe function
 */
export const subscribeToRequests = (callback: (requests: DonationRequest[]) => void) => {
    const colRef = collection(db, 'requests');
    const q = query(
        colRef, 
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const requestsList: DonationRequest[] = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        } as DonationRequest));
        callback(requestsList);
    }, (error) => {
        console.error('Real-time listener error:', error);
    });
};

/**
 * Find nearby donors for specific blood group
 */
export const getNearbyDonors = async ({ 
    latitude, 
    longitude, 
    radiusInKm, 
    bloodGroup 
}: { 
    latitude: number, 
    longitude: number, 
    radiusInKm: number, 
    bloodGroup: string 
}) => {
    try {
        const center: [number, number] = [latitude, longitude];
        const radiusInM = radiusInKm * 1000;

        // Get the bounds for our geohash query
        const bounds = geohashQueryBounds(center, radiusInM);
        const promises = [];

        for (const b of bounds) {
            const q = query(
                collection(db, 'users'),
                where('roles', 'array-contains', 'donor'),
                where('isAvailable', '==', true),
                where('bloodGroup', '==', bloodGroup),
                orderBy('location.geohash'),
                startAt(b[0]),
                endAt(b[1])
            );
            promises.push(getDocs(q));
        }

        // Wait for all queries to finish
        const snapshots = await Promise.all(promises);
        const matchingDocs: any[] = [];

        for (const snap of snapshots) {
            for (const docSnapshot of snap.docs) {
                const data = docSnapshot.data() as UserDocument;
                const lat = data.location.latitude;
                const lng = data.location.longitude;

                // We have to filter out false positives due to geohash accuracy (square bounds vs radius)
                const distanceInKm = distanceBetween([lat, lng], center);
                const distanceInM = distanceInKm * 1000;

                if (distanceInM <= radiusInM) {
                    matchingDocs.push({
                        uid: data.uid,
                        name: data.name,
                        phone: data.phone,
                        bloodGroup: data.bloodGroup,
                        distance: Math.round(distanceInKm * 10) / 10, // Round to 1 decimal place
                    });
                }
            }
        }

        // Sort by distance and return
        return matchingDocs.sort((a, b) => a.distance - b.distance);
    } catch (error) {
        console.error('Error finding nearby donors:', error);
        throw error;
    }
};

/**
 * Creates a new donation record in the "donations" collection.
 * @param donationData - Donation data
 */
export const createDonation = async (donationData: Omit<Donation, 'id' | 'createdAt'>): Promise<string> => {
    try {
        const colRef = collection(db, 'donations');
        const docRef = await addDoc(colRef, {
            ...donationData,
            createdAt: serverTimestamp(),
        } as any);
        return docRef.id;
    } catch (error) {
        console.error('Error creating donation:', error);
        throw error;
    }
};

export { db };
