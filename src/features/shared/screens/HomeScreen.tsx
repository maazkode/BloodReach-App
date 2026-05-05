import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { useAuth } from '../context/AuthContext';
import { getUserDocument, updateUserLocation } from '../services/firestoreService';
import { getFullLocationData } from '../services/locationService';
import { Colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkRoleAndNavigate = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const profile = await getUserDocument(user.uid);
                
                // Location Refresh Logic (Refresh if older than 6 hours)
                if (profile) {
                    const now = Date.now();
                    let lastUpdate = 0;
                    if (profile.locationUpdatedAt) {
                        const ts = profile.locationUpdatedAt as any;
                        if (typeof ts.toMillis === 'function') lastUpdate = ts.toMillis();
                        else if (typeof ts.toDate === 'function') lastUpdate = ts.toDate().getTime();
                    }
                    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

                    if (hoursSinceUpdate > 6) {
                        try {
                            const locData = await getFullLocationData();
                            await updateUserLocation(user.uid, {
                                latitude: locData.latitude,
                                longitude: locData.longitude,
                                geohash: locData.geohash,
                                address: locData.address,
                            });
                            console.log('[Location] Location updated successfully on app start');
                        } catch (locErr) {
                            console.log('[Location] Failed to update location on app start:', locErr);
                        }
                    }
                }

                if (profile && profile.roles) {
                    if (profile.roles.includes('donor')) {
                        navigation.replace('DonorDashboard', { tab: 'home' });
                    } else {
                        navigation.replace('RequesterDashboard', { tab: 'home' });
                    }
                } else {
                    // No Firestore document, send to unified registration
                    navigation.replace('UnifiedRegistration');
                }
            } catch (error) {
                console.error('Error redirecting based on profile:', error);
                setLoading(false);
            }
        };

        checkRoleAndNavigate();
    }, [user, navigation]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
});

export default HomeScreen;
