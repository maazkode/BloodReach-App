import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveDonorMatches, getDistance } from '../api/firestoreService';
import { UserDocument } from '../types/database';

export const useDonorMatches = (refreshKey?: number, userData?: UserDocument | null) => {
    const { user } = useAuth();
    const [activeHelps, setActiveHelps] = React.useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = React.useState(true);

    // Store userData in a ref so the callback always has the latest value
    // without the effect needing to re-run (and resubscribe) when it changes.
    const userDataRef = React.useRef(userData);
    React.useEffect(() => {
        userDataRef.current = userData;
    }, [userData]);

    React.useEffect(() => {
        if (!user) {
            setLoadingMatches(false);
            return;
        }

        setLoadingMatches(true);
        const unsubMatches = getActiveDonorMatches(user.uid, (matches) => {
            const latestUserData = userDataRef.current;
            const enriched = matches.map(match => {
                if (
                    match.request?.location?.latitude &&
                    latestUserData?.location?.latitude
                ) {
                    const dist = getDistance(
                        latestUserData.location.latitude,
                        latestUserData.location.longitude,
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
        // Only resubscribe when user identity or manual refreshKey changes.
        // userData changes are handled via ref above.
    }, [user, refreshKey]);

    return { activeHelps, loadingMatches };
};
