import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { useAuth } from '../context/AuthContext';
import { getUserDocument } from '../services/firestoreService';
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
                    const lastUpdate = profile.locationUpdatedAt ? (profile.locationUpdatedAt as any).toMillis() : 0;
                    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

                    if (hoursSinceUpdate > 6) {
                        try {
                            const { getFullLocationData } = require('../services/locationService');
                            const { updateUserLocation } = require('../services/firestoreService');
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
                        navigation.replace('DonorDashboard');
                    } else {
                        navigation.replace('RequesterDashboard');
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
