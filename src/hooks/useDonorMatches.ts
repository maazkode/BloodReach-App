import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveDonorMatches, getDistance } from '../api/firestoreService';
import { UserDocument } from '../types/database';

export const useDonorMatches = (refreshKey?: number, userData?: UserDocument | null) => {
    const { user } = useAuth();
    const [activeHelps, setActiveHelps] = React.useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = React.useState(true);

    React.useEffect(() => {
        if (!user) {
            setLoadingMatches(false);
            return;
        }
        
        setLoadingMatches(true);
        const unsubMatches = getActiveDonorMatches(user.uid, (matches) => {
            // Attach distance to each match's embedded request (same as nearbyRequests)
            const enriched = matches.map(match => {
                if (
                    match.request?.location?.latitude &&
                    userData?.location?.latitude
                ) {
                    const dist = getDistance(
                        userData.location.latitude,
                        userData.location.longitude,
                        match.request.location.latitude,
                        match.request.location.longitude
                    );
                    (match.request as any).distance = Math.round(dist * 10) / 10;
                }
                return match;
            });
            setActiveHelps(enriched);
            setLoadingMatches(false);
        });
        
        return () => unsubMatches();
    }, [user, refreshKey, userData]);

    return { activeHelps, loadingMatches };
};
