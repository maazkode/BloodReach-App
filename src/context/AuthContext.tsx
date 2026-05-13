import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, FirebaseAuthTypes } from '@react-native-firebase/auth';
interface AuthContextType {
    user: FirebaseAuthTypes.User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
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


    const value = React.useMemo(() => ({ user, loading }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
