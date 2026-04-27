import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../theme/colors';
import { Alert } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { signInWithGoogle } from '../services/authService';
import { getUserDocument, createUserDocument } from '../services/firestoreService';
import { getFCMToken } from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const { width } = Dimensions.get('window');

const AuthScreen: React.FC<Props> = ({ navigation }) => {
    const handleGoogleSignIn = async () => {
        try {
            const user = await signInWithGoogle();
            if (user) {
                const profile = await getUserDocument(user.uid);
                if (profile) {
                    // Update FCM Token on every login
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
            console.error('Sign In Error:', error);
            Alert.alert('Sign In Error', error.message || 'Something went wrong');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Visual Elements Section */}
                <View style={styles.artworkContainer}>
                    <View style={[styles.glowCircle, styles.glowCircleOuter]} />
                    <View style={[styles.glowCircle, styles.glowCircleInner]} />
                    <View style={styles.iconWrapper}>
                        <MaterialIcon name="water-drop" size={48} color="white" />
                    </View>
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={styles.mainTitle}>BloodReach</Text>
                    <Text style={styles.tagline}>Save Lives, Spread Hope</Text>
                    <Text style={styles.descriptionText}>
                        Join the fastest-growing community of blood donors and recipients. 
                        A single drop of your blood can be someone's ocean of hope.
                    </Text>
                </View>

                {/* Bottom Actions */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={styles.googleButtonMain}
                        onPress={handleGoogleSignIn}
                        activeOpacity={0.8}
                    >
                        <FAIcon name="google" size={22} color="#4285F4" style={styles.socialIcon} />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.footerText}>
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Very soft cool gray for a premium look
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingVertical: 50,
    },
    artworkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        height: 200,
    },
    glowCircle: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: Colors.primary,
    },
    glowCircleOuter: {
        width: width * 0.75,
        height: width * 0.75,
        opacity: 0.05,
    },
    glowCircleInner: {
        width: width * 0.5,
        height: width * 0.5,
        opacity: 0.1,
    },
    iconWrapper: {
        width: 100,
        height: 100,
        backgroundColor: Colors.primary,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 10,
        marginTop: -20,
    },
    mainTitle: {
        fontSize: 38,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    descriptionText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    actionContainer: {
        width: '100%',
        paddingBottom: 20,
    },
    googleButtonMain: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        height: 60,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 5,
        marginBottom: 24,
    },
    googleButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
    },
    socialIcon: {
        marginRight: 12,
    },
    footerText: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
});

export default AuthScreen;
