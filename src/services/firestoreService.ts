import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from '@react-native-firebase/firestore';

/**
 * Initialize Firestore instance using the modular API.
 */
const db = getFirestore();

/**
 * Interface for User data
 */
interface UserData {
    uid: string;
    name: string;
    email: string;
}

/**
 * Creates a new user document in the "users" collection if it doesn't already exist.
 * 
 * @param user - The user object containing uid, name, and email.
 */
export const createUser = async (user: UserData): Promise<void> => {
    try {
        const userRef = doc(db, 'users', user.uid);

        // Check if user already exists to avoid duplicates/overwriting data
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            console.log('User already exists in Firestore, skipping creation.');
            return;
        }

        // Document structure for new users
        const userData = {
            name: user.name,
            email: user.email,
            credits: 10,
            role: 'user',
            createdAt: serverTimestamp(),
        };

        await setDoc(userRef, userData);
        console.log('New user document created successfully:', user.uid);
    } catch (error) {
        console.error('Error in createUser:', error);
        throw error;
    }
};

export { db };
