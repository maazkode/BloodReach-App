import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { createUser } from './firestoreService';
import { Alert } from 'react-native';


/**
 * Configure Google Sign-In with your Web Client ID from Firebase Console.
 * Path: Settings > General > Your apps > Web apps (or Android app's Web Client ID in Auth section)
 */
GoogleSignin.configure({
    webClientId: '77440415256-99qs4h1gk8ec50brk7vb427a4br49pm9.apps.googleusercontent.com', // Replace with actual Web Client ID
});

/**
 * Handles the Google Sign-In process, Firebase authentication, 
 * and user document creation in Firestore.
 * 
 * @returns The authenticated user object or null if cancelled.
 */
export const signInWithGoogle = async () => {
    try {
        // Check if device has Google Play Services
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        // Step 1: Trigger Google Sign-In picker
        // const { idToken, user: googleUser } = await GoogleSignin.signIn();
        const signInResult = await GoogleSignin.signIn();

        const idToken = signInResult.data?.idToken;
        const googleUser = signInResult.data?.user;

        if (!idToken) {
            throw new Error('Google Sign-In failed: No ID Token found.');
        }

        // Step 2: Create a Google credential with the token
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);

        // Step 3: Authenticate with Firebase using the credential
        const userCredential = await auth().signInWithCredential(googleCredential);
        const firebaseUser = userCredential.user;

        // Step 4: After successful login, ensure user exists in Firestore
        if (firebaseUser) {
            await createUser({
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || googleUser?.name || 'Anonymous User',
                email: firebaseUser.email || googleUser?.email || '',
            });

            console.log('Google Sign-In successful for:', firebaseUser.email);
            return firebaseUser;
        }

        return null;
    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log('User cancelled the Google Sign-In flow');
        } else if (error.code === statusCodes.IN_PROGRESS) {
            console.log('Google Sign-In is already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            console.error('Play Services not available or outdated');
            Alert.alert('Error', 'Google Play Services is not available. Please install it to sign in.');
        } else {
            console.error('Google Sign-In Error:', error);
            throw error;
        }
        return null;
    }
};

/**
 * Sign out from both Firebase and Google.
 */
export const signOut = async () => {
    try {
        await GoogleSignin.signOut();
        await auth().signOut();
        console.log('Signed out successfully');
    } catch (error) {
        console.error('Sign-Out Error:', error);
        throw error;
    }
};
