import { getAuth, GoogleAuthProvider, signInWithCredential, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';

/**
 * Configure Google Sign-In with your Web Client ID from Firebase Console.
 */
GoogleSignin.configure({
    webClientId: '77440415256-99qs4h1gk8ec50brk7vb427a4br49pm9.apps.googleusercontent.com', // Replace with actual Web Client ID
});

/**
 * Handles the Google Sign-In process, Firebase authentication.
 * @returns The authenticated user object or null if cancelled.
 */
export const signInWithGoogle = async () => {
    try {
        const auth = getAuth();
        // Check if device has Google Play Services
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        // Step 1: Trigger Google Sign-In picker
        const signInResult = await GoogleSignin.signIn();

        const idToken = signInResult.data?.idToken;

        if (!idToken) {
            throw new Error('Google Sign-In failed: No ID Token found.');
        }

        // Step 2: Create a Google credential with the token
        const googleCredential = GoogleAuthProvider.credential(idToken);

        // Step 3: Authenticate with Firebase using the credential
        const userCredential = await signInWithCredential(auth, googleCredential);
        const firebaseUser = userCredential.user;

        if (firebaseUser) {
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
 * Signs up a user with email and password.
 */
export const signUpWithEmail = async (email: string, pass: string) => {
    try {
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
    } catch (error: any) {
        console.error('Sign Up Error:', error);
        throw error;
    }
};

/**
 * Signs in a user with email and password.
 */
export const signInWithEmail = async (email: string, pass: string) => {
    try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
    } catch (error: any) {
        console.error('Sign In Error:', error);
        throw error;
    }
};

/**
 * Sign out from both Firebase and Google.
 */
export const signOut = async () => {
    try {
        const auth = getAuth();
        await GoogleSignin.signOut();
        await firebaseSignOut(auth);
        console.log('Signed out successfully');
    } catch (error) {
        console.error('Sign-Out Error:', error);
        throw error;
    }
};
