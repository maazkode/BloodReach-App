import React from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUser, checkAndRefreshEligibility } from '../api/firestoreService';
import { UserDocument } from '../types/database';
import { useModal } from '../context/ModalContext';

export const useDonorEligibility = () => {
    const { user } = useAuth();
    const { showModal } = useModal();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [loadingUser, setLoadingUser] = React.useState(true);

    React.useEffect(() => {
        if (!user) return;

        checkAndRefreshEligibility(user.uid);

        const unsubUser = subscribeToUser(user.uid, (data) => {
            if (data) {
                setUserData(data);
                setLoadingUser(false);
            } else {
                setLoadingUser(false);
            }
        });

        return () => unsubUser();
    }, [user]);

    const isAgeRestricted = React.useMemo(() => 
        userData?.age !== undefined && (userData.age < 18 || userData.age > 60)
    , [userData?.age]);

    const isCooldownActive = React.useMemo(() => 
        userData?.isEligibleToDonate === false && !isAgeRestricted
    , [userData?.isEligibleToDonate, isAgeRestricted]);

    const formatCooldownDate = React.useCallback((timestamp: any) => {
        if (!timestamp) return 'Available Now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }, []);

    // Cooldown timer logic
    React.useEffect(() => {
        if (!userData?.donationCooldownUntil || userData?.isEligibleToDonate || !user) return;

        const cooldownDate = (userData.donationCooldownUntil as any).toDate();
        const now = new Date();
        const timeUntilEligible = cooldownDate.getTime() - now.getTime();

        if (timeUntilEligible <= 0) {
            checkAndRefreshEligibility(user.uid).then(updated => {
                if (updated) setUserData(updated);
            });
            return;
        }

        const timer = setTimeout(() => {
            checkAndRefreshEligibility(user.uid).then(updated => {
                if (updated) {
                    setUserData(updated);
                    showModal({
                        title: 'Welcome Back! 🩸',
                        description: 'Your recovery period is over. You are now eligible to donate and save lives again!',
                        type: 'success',
                        primaryText: 'Great'
                    });
                }
            });
        }, timeUntilEligible + 2000);

        return () => clearTimeout(timer);
    }, [userData?.donationCooldownUntil, userData?.isEligibleToDonate, user, showModal]);

    return {
        userData,
        loadingUser,
        isAgeRestricted,
        isCooldownActive,
        formatCooldownDate
    };
};
