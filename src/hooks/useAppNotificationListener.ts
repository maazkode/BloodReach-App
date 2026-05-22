import { useEffect, useRef } from 'react';
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    FirebaseFirestoreTypes,
    doc,
    updateDoc,
} from '@react-native-firebase/firestore';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useAuth } from '../context/AuthContext';

const db = getFirestore();

/**
 * useAppNotificationListener
 *
 * Listens for newly created documents in the `notifications` collection where:
 *   - toUserId == currentUser.uid
 *   - status == 'pending'
 *
 * On each new document detected via `docChanges()`, it fires a local
 * Notifee notification. It then updates the status of the notification
 * in Firestore to 'delivered' so it doesn't trigger again on another device.
 *
 * Spark Plan compatible: uses Firestore onSnapshot only — no Cloud Functions.
 */
export const useAppNotificationListener = (): void => {
    const { user } = useAuth();
    const notifiedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'notifications'),
            where('toUserId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type !== 'added') return;

                    const notificationId = change.doc.id;
                    const data = change.doc.data();

                    if (notifiedIds.current.has(notificationId)) return;
                    notifiedIds.current.add(notificationId);

                    try {
                        await notifee.displayNotification({
                            id: notificationId,
                            title: data.title || 'BloodReach Notification',
                            body: data.body || 'You have a new update.',
                            android: {
                                channelId: 'default',
                                importance: AndroidImportance.HIGH,
                                pressAction: { id: 'default' },
                                smallIcon: 'ic_launcher',
                            },
                            data: data.data || {},
                        });

                        // Mark as delivered in Firestore so it doesn't fire again
                        const docRef = doc(db, 'notifications', notificationId);
                        await updateDoc(docRef, { status: 'delivered' });

                        console.log(`[AppNotification] Shown & marked delivered: ${notificationId}`);
                    } catch (error) {
                        console.error('[AppNotification] Failed to show notification:', error);
                        notifiedIds.current.delete(notificationId);
                    }
                });
            },
            (error) => {
                console.error('[AppNotification] Firestore listener error:', error);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);
};
