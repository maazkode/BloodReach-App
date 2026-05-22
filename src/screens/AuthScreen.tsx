import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LoadingScreen from '../components/common/LoadingScreen';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { signInWithGoogle } from '../api/authService';
import { getUserDocument, createUserDocument } from '../api/firestoreService';
import { getFCMToken } from '../api/notificationService';
import { Colors } from '../constants/Colors';
import { useModal } from '../context/ModalContext';
import { log } from '../utility/errorHandler';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC<Props> = ({ navigation }) => {
    const { showModal } = useModal();
    const [loading, setLoading] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.08,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]);

        Animated.loop(pulse).start();
    }, [pulseAnim]);

    const handleGoogleSignIn = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const user = await signInWithGoogle();

            if (user) {
                const profile = await getUserDocument(user.uid);

                if (profile && profile.profileCompleted) {
                    const token = await getFCMToken();
                    if (token) {
                        await createUserDocument({ uid: user.uid, fcmToken: token });
                    }

                    if (profile.roles && profile.roles.includes('donor')) {
                        navigation.replace('DonorDashboard', { tab: 'home' });
                    } else {
                        navigation.replace('RequesterDashboard', { tab: 'home' });
                    }
                } else {
                    navigation.replace('UnifiedRegistration');
                }
            }
        } catch (error: any) {
            // Show a specific modal for no internet — checked before sign-in dialog opens
            if (error?.code === 'NO_INTERNET') {
                showModal({
                    title: 'No Internet Connection',
                    description: 'Please check your Wi-Fi or mobile data and try again.',
                    type: 'error',
                    primaryText: 'OK',
                });
                return;
            }

            // Ignore cancellation or in-progress errors to prevent annoying modals
            const isCancelled =
                error?.code === 'SIGN_IN_CANCELLED' ||
                error?.code === '7' || // Common code for sign-in cancelled
                error?.code === '12501' || // Google Play Services cancellation code
                error?.code === 'DEVELOPER_ERROR' || // Often happens if config is valid but user backs out
                (error?.message?.toLowerCase().includes('google sign-in') && !error?.code) ||
                error?.message?.toLowerCase().includes('cancel') ||
                error?.message?.toLowerCase().includes('interrupted') ||
                error?.message?.toLowerCase().includes('id token') ||
                error?.message?.toLowerCase().includes('signin failed');

            if (isCancelled) {
                log('info', 'AuthScreen', 'Sign-in attempt silently ignored', { message: error.message });
                return;
            }

            showModal({
                title: 'Sign In Error',
                description: error.message || 'Something went wrong',
                type: 'error',
                primaryText: 'Try Again'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingScreen title="Authenticating" tagline="Signing you in securely..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {/* Branding Section */}
                <View style={styles.brandingContainer}>

                    {/* Logo */}
                    <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulseAnim }] }]}>
                        <Image
                            source={require('../assets/logo.png')} // ✅ clean path
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>

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
                                <FAIcon name="google" size={25} color={Colors.primary} />
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
        alignItems: 'center',
        justifyContent: 'center',
    },

    logo: {
        width: 100,
        height: 100,
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
        borderRadius: 10,
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



