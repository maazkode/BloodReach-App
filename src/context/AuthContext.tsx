import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, FirebaseAuthTypes } from '@react-native-firebase/auth';
import { UserDocument } from '../types/database';
import { subscribeToUser } from '../api/firestoreService';
interface AuthContextType {
    user: FirebaseAuthTypes.User | null;
    userData: UserDocument | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [userData, setUserData] = useState<UserDocument | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        const minSplashTime = 2500;
        const start = Date.now();

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, minSplashTime - elapsed);

            setTimeout(() => {
                setUser(firebaseUser);
                setLoading(false);
            }, remaining);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!user) {
            setUserData(null);
            return;
        }

        const unsubscribe = subscribeToUser(user.uid, (data) => {
            setUserData(data);
        });

        return unsubscribe;
    }, [user]);

    const value = React.useMemo(() => ({ user, userData, loading }), [user, userData, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
