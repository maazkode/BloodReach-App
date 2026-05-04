import { getAuth, GoogleAuthProvider, signInWithCredential, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';
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
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult.data?.idToken;

        if (!idToken) {
            throw new Error('Google Sign-In failed: No ID Token found.');
        }

        const googleCredential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        const firebaseUser = userCredential.user;

        if (firebaseUser) {
            log('info', 'Auth > signInWithGoogle', 'Google Sign-In successful', { email: firebaseUser.email });
            return firebaseUser;
        }

        return null;
    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            log('info', 'Auth > signInWithGoogle', 'User cancelled sign-in');
        } else if (error.code === statusCodes.IN_PROGRESS) {
            log('warn', 'Auth > signInWithGoogle', 'Sign-in already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            log('error', 'Auth > signInWithGoogle', 'Play Services unavailable');
            Alert.alert('Error', 'Google Play Services is not available. Please install it to sign in.');
        } else {
            log('error', 'Auth > signInWithGoogle', 'Unexpected error', { code: error?.code });
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
