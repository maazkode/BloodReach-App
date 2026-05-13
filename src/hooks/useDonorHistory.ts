import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getDonorHistory } from '../api/firestoreService';

export const useDonorHistory = (activeTab: string) => {
    const { user } = useAuth();
    const [donationHistory, setDonationHistory] = React.useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(true);

    React.useEffect(() => {
        if (!user || activeTab !== 'history') {
            setLoadingHistory(false);
            return;
        }
        
        setLoadingHistory(true);
        const unsubHistory = getDonorHistory(user.uid, (history) => {
            setDonationHistory(history);
            setLoadingHistory(false);
        });
        
        return () => unsubHistory();
    }, [user, activeTab]);

    return { donationHistory, loadingHistory };
};
