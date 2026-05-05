import { getAuth, GoogleAuthProvider, signInWithCredential, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { log, translateError } from '../../shared/utils/errorHandler';

/**
 * Configure Google Sign-In with your Web Client ID from Firebase Console.
 */
GoogleSignin.configure({
    webClientId: '77440415256-99qs4h1gk8ec50brk7vb427a4br49pm9.apps.googleusercontent.com',
});

/**
 * Handles the Google Sign-In process, Firebase authentication.
 * @returns The authenticated user object or null if cancelled.
 */
export const signInWithGoogle = async () => {
    try {
        const auth = getAuth();
        // 1. Check for Play Services
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        // 2. Perform Google Sign-In
        const signInResult = await GoogleSignin.signIn();
        
        // 3. Extract the ID Token (Defensive Check)
        const idToken = signInResult.data?.idToken;

        // If user cancels or idToken is missing, exit early to prevent Firebase crash
        if (!idToken) {
            log('info', 'Auth > signInWithGoogle', 'No ID Token found - likely cancelled by user');
            return null;
        }

        // 4. Create Firebase credential and sign in
        const googleCredential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        const firebaseUser = userCredential.user;

        if (firebaseUser) {
            log('info', 'Auth > signInWithGoogle', 'Google Sign-In successful', { email: firebaseUser.email });
            return firebaseUser;
        }

        return null;
    } catch (error: any) {
        // 5. Handle specific Google error codes
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            log('info', 'Auth > signInWithGoogle', 'User cancelled Google Sign-In');
            return null;
        } else if (error.code === statusCodes.IN_PROGRESS) {
            log('warn', 'Auth > signInWithGoogle', 'Google Sign-In already in progress');
            return null;
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            log('error', 'Auth > signInWithGoogle', 'Google Play Services not available');
            throw new Error('Google Play Services is required for sign-in.');
        } else {
            // 6. Handle unexpected errors
            log('error', 'Auth > signInWithGoogle', 'Unexpected Sign-In Error', { 
                code: error?.code, 
                message: error?.message 
            });
            throw error;
        }
    }
};

/**
 * Signs up a user with email and password.
 */
export const signUpWithEmail = async (email: string, pass: string) => {
    try {
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        log('info', 'Auth > signUpWithEmail', 'Account created', { email });
        return userCredential.user;
    } catch (error: any) {
        log('error', 'Auth > signUpWithEmail', 'Sign-up failed', { code: error?.code });
        throw new Error(translateError(error));
    }
};

/**
 * Signs in a user with email and password.
 */
export const signInWithEmail = async (email: string, pass: string) => {
    try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        log('info', 'Auth > signInWithEmail', 'Signed in', { email });
        return userCredential.user;
    } catch (error: any) {
        log('error', 'Auth > signInWithEmail', 'Sign-in failed', { code: error?.code });
        throw new Error(translateError(error));
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
        log('info', 'Auth > signOut', 'Signed out successfully');
    } catch (error: any) {
        log('error', 'Auth > signOut', 'Sign-out failed', { code: error?.code });
        throw error;
    }
};

