import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { signInWithGoogle } from '../services/authService';
import { getUserDocument, createUserDocument } from '../services/firestoreService';
import { getFCMToken } from '../services/notificationService';
import { Colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC<Props> = ({ navigation }) => {
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const user = await signInWithGoogle();

            if (user) {
                const profile = await getUserDocument(user.uid);

                if (profile) {
                    const token = await getFCMToken();
                    if (token) {
                        await createUserDocument({ uid: user.uid, fcmToken: token });
                    }

                    if (profile.roles && profile.roles.includes('donor')) {
                        navigation.replace('DonorDashboard');
                    } else {
                        navigation.replace('RequesterDashboard');
                    }
                } else {
                    navigation.replace('UnifiedRegistration');
                }
            }
        } catch (error: any) {
            Alert.alert('Sign In Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {/* Branding Section */}
                <View style={styles.brandingContainer}>

                    {/* Logo */}
                    <View style={styles.logoWrapper}>
                        <Image
                            source={require('../assets/logo.png')} // ✅ clean path
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Text */}
                    <View style={styles.textContainer}>
                        <Text style={styles.mainTitle}>BloodReach</Text>
                        <Text style={styles.subtitle}>
                            Find blood donors instantly near you
                        </Text>
                        <Text style={styles.trustText}>
                            Secure • Fast • Life-saving
                        </Text>
                    </View>

                </View>

                {/* Impact Section - Fills the middle space elegantly */}
                <View style={styles.impactContainer}>
                    <View style={styles.impactLine} />
                    <View style={styles.impactBadge}>
                        <MaterialIcon name="favorite" size={20} color={Colors.primary} />
                        <Text style={styles.impactText}>Save Lives in Real-time</Text>
                    </View>
                    <View style={styles.impactLine} />
                </View>

                {/* Actions */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.primary} />
                        ) : (
                            <>
                                <FAIcon name="google" size={20} color="#4285F4" />
                                <Text style={styles.googleText}>
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.footerText}>
                        By continuing, you agree to Terms & Privacy
                    </Text>
                </View>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingVertical: 60,
    },

    brandingContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 32,
    },

    logoWrapper: {
        width: 110,
        height: 110,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        // Premium Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },

    logo: {
        width: 80,
        height: 80,
    },

    textContainer: {
        alignItems: 'center',
    },

    mainTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },

    subtitle: {
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        marginBottom: 10,
    },

    trustText: {
        fontSize: 13,
        color: '#94A3B8',
    },

    impactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },

    impactLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#F1F5F9',
    },

    impactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 16,
    },

    impactText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
        marginLeft: 8,
    },

    actionContainer: {
        width: '100%',
    },

    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        height: 56,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
        elevation: 2, // subtle shadow
    },

    googleText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },

    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default AuthScreen;