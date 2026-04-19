import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
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
