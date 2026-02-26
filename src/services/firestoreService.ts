import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp
} from '@react-native-firebase/firestore';
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
 * Creates or updates a user document in the "users" collection.
 * @param userData - Partial user data to save
 */
export const createUserDocument = async (userData: Partial<UserDocument>): Promise<void> => {
    if (!userData.uid) throw new Error('UID is required to create a user document');

    try {
        const userRef = doc(db, 'users', userData.uid);

        const finalData = {
            ...userData,
            isAvailable: userData.role === 'donor', // Default available if donor
            lastDonationDate: userData.lastDonationDate || null,
            isVerified: userData.isVerified || false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // We use { merge: true } to avoid overwriting existing fields if any
        await setDoc(userRef, finalData as any, { merge: true });
        console.log('User document saved successfully');
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
};

/**
 * Creates a new donation request in the "donationRequests" collection.
 * @param requestData - Donation request data
 */
export const createDonationRequest = async (requestData: Omit<DonationRequest, 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
        const colRef = collection(db, 'donationRequests');
        const docRef = await addDoc(colRef, {
            ...requestData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        } as any);
        return docRef.id;
    } catch (error) {
        console.error('Error creating donation request:', error);
        throw error;
    }
};

/**
 * Creates a new donation record in the "donations" collection.
 * @param donationData - Donation data
 */
export const createDonation = async (donationData: Omit<Donation, 'createdAt'>): Promise<string> => {
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
