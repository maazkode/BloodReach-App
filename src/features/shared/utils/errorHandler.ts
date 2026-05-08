/**
 * BloodReach — Central Error Handling System
 *
 * Provides:
 *  - Network connectivity check
 *  - Firebase / Firestore error code translation
 *  - Safe async wrapper (prevents double-tap, shows retry)
 *  - Structured logger with context tags
 */

import { Alert } from 'react-native';

// ─── Logger ──────────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';

export const log = (level: LogLevel, context: string, message: string, data?: any): void => {
    const prefix = `[BloodReach][${context}]`;

};

// ─── Network Check ────────────────────────────────────────────────────────────

/**
 * Lightweight connectivity check by fetching a tiny resource.
 * Returns true if online, false if offline.
 */
export const isOnline = async (): Promise<boolean> => {
    try {
        await fetch('https://www.google.com', { method: 'HEAD' });
        return true;
    } catch {
        return false;
    }
};

// ─── Error Translator ─────────────────────────────────────────────────────────

const FIREBASE_ERROR_MAP: Record<string, string> = {
    // Auth errors
    'auth/invalid-email': 'The email address is not valid.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/account-exists-with-different-credential': 'This email is linked to a different sign-in method.',

    // Firestore errors
    'firestore/permission-denied': 'You do not have permission to perform this action.',
    'firestore/unavailable': 'The service is temporarily unavailable. Please try again.',
    'firestore/not-found': 'The requested data could not be found.',
    'firestore/deadline-exceeded': 'The request timed out. Please check your connection.',
    'firestore/resource-exhausted': 'Request limit reached. Please try again later.',
    'firestore/aborted': 'The operation was interrupted. Please try again.',
    'firestore/already-exists': 'This record already exists.',
    'firestore/cancelled': 'The operation was cancelled.',

    // Network / Generic
    'network-request-failed': 'Network error. Please check your internet connection and try again.',
};

/**
 * Translates a Firebase/Firestore error code into a user-friendly message.
 */
export const translateError = (error: any): string => {
    if (!error) return 'An unexpected error occurred.';

    const code: string = error?.code || '';
    if (FIREBASE_ERROR_MAP[code]) {
        return FIREBASE_ERROR_MAP[code];
    }

    // Firestore codes sometimes come as "7 PERMISSION_DENIED" — extract the label
    const message: string = error?.message || '';
    if (message.toLowerCase().includes('network')) {
        return 'Network error. Please check your internet connection.';
    }
    if (message.toLowerCase().includes('permission')) {
        return 'You do not have permission to perform this action.';
    }
    if (message.toLowerCase().includes('not-found') || message.toLowerCase().includes('no document')) {
        return 'The requested data could not be found.';
    }

    return message || 'An unexpected error occurred. Please try again.';
};

// ─── Safe Async Wrapper ───────────────────────────────────────────────────────

interface SafeRunOptions {
    /** Tag shown in logs e.g. 'DonorDashboard > fetchUser' */
    context: string;
    /** Message shown in the error alert title */
    errorTitle?: string;
    /** If true, shows a Retry button in the error alert */
    allowRetry?: boolean;
    /** Called before execution — return false to cancel (e.g. while loading) */
    guard?: () => boolean;
    /** Callback invoked on success */
    onSuccess?: () => void;
    /** Callback invoked on error (after alert) */
    onError?: (error: any) => void;
    /** Custom modal function from useModal hook */
    showModal?: (options: any) => void;
}

/**
 * Wraps an async operation with:
 *  - Network connectivity check
 *  - Structured logging
 *  - User-friendly error alerts with optional Retry
 *  - Guard to prevent double execution
 */
export const safeRun = async (
    fn: () => Promise<any>,
    options: SafeRunOptions
): Promise<boolean> => {
    const {
        context,
        errorTitle = 'Something went wrong',
        allowRetry = false,
        guard,
        onSuccess,
        onError,
    } = options;

    // Guard: prevent double-tap or invalid state
    if (guard && !guard()) {
        log('warn', context, 'Execution blocked by guard');
        return false;
    }

    // Network check
    const online = await isOnline();
    if (!online) {
        log('warn', context, 'No internet connection');
        if (options.showModal) {
            options.showModal({
                title: 'No Internet Connection',
                description: 'Please check your Wi-Fi or mobile data and try again.',
                type: 'error',
                primaryText: 'OK'
            });
        } else {
            Alert.alert(
                'No Internet Connection',
                'Please check your Wi-Fi or mobile data and try again.',
                [{ text: 'OK' }]
            );
        }
        return false;
    }

    try {
        log('info', context, 'Starting operation');
        await fn();
        log('info', context, 'Operation completed successfully');
        onSuccess?.();
        return true;
    } catch (error: any) {
        const userMessage = translateError(error);
        if (options.showModal) {
            options.showModal({
                title: errorTitle,
                description: userMessage,
                type: 'error',
                primaryText: allowRetry ? 'Retry' : 'OK',
                onPrimaryPress: allowRetry ? () => safeRun(fn, options) : undefined,
                secondaryText: allowRetry ? 'Cancel' : undefined,
            });
        } else {
            const buttons: any[] = [{ text: 'OK' }];
            if (allowRetry) {
                buttons.unshift({
                    text: 'Retry',
                    onPress: () => safeRun(fn, options),
                });
            }
            Alert.alert(errorTitle, userMessage, buttons);
        }
        onError?.(error);
        return false;
    }
};
