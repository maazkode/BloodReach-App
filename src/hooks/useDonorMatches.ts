import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveDonorMatches } from '../api/firestoreService';

export const useDonorMatches = () => {
    const { user } = useAuth();
    const [activeHelps, setActiveHelps] = React.useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = React.useState(true);

    React.useEffect(() => {
        if (!user) {
            setLoadingMatches(false);
            return;
        }
        
        const unsubMatches = getActiveDonorMatches(user.uid, (matches) => {
            setActiveHelps(matches);
            setLoadingMatches(false);
        });
        
        return () => unsubMatches();
    }, [user]);

    return { activeHelps, loadingMatches };
};
