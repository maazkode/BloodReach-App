import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../theme/colors';
import { Alert } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/authService';
import { checkUserExists, getUserDocument } from '../services/firestoreService';


type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC<Props> = ({ navigation }) => {
    const [isLogin, setIsLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        try {
            if (isLogin) {
                const user = await signInWithEmail(email, password);
                if (user) {
                    const profile = await getUserDocument(user.uid);
                    if (profile) {
                        // User exists, go to primary dashboard
                        if (profile.primaryRole === 'donor' || profile.isDonor) {
                            navigation.replace('DonorDashboard');
                        } else {
                            navigation.replace('RequesterDashboard');
                        }
                    } else {
                        // User exists in Auth but no profile yet
                        navigation.replace('UnifiedRegistration');
                    }
                }
            } else {
                const user = await signUpWithEmail(email, password);
                if (user) {
                    navigation.replace('UnifiedRegistration');
                }
            }
        } catch (error: any) {
            console.error('Auth Error:', error);
            Alert.alert('Authentication Error', error.message || 'Something went wrong');
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            const user = await signInWithGoogle();
            if (user) {
                const profile = await getUserDocument(user.uid);
                if (profile) {
                    if (profile.primaryRole === 'donor' || profile.isDonor) {
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialIcon name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isLogin ? 'Login' : 'Create Account'}</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.content}>
                    {/* Branding Section */}
                    <View style={styles.brandingSection}>
                        <View style={styles.logoContainer}>
                            <MaterialIcon name="water-drop" size={28} color={Colors.primary} />
                        </View>
                        <Text style={styles.mainTitle}>
                            {isLogin ? 'Welcome Back' : 'Join BloodReach'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isLogin
                                ? 'Log in to continue your life-saving journey.'
                                : 'Become a part of our life-saving community today.'}
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.card}>
                        {/* Email Field */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcon name="email" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@example.com"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        {/* Password Field */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialIcon name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={isLogin ? "Your password" : "At least 8 characters"}
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <MaterialIcon
                                        name={showPassword ? "visibility" : "visibility-off"}
                                        size={20}
                                        color="#94A3B8"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {isLogin && (
                            <TouchableOpacity style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}

                        {/* Auth Button */}
                        <TouchableOpacity
                            style={styles.authButton}
                            onPress={handleAuth}
                        >
                            <Text style={styles.authButtonText}>
                                {isLogin ? 'Login' : 'Sign Up'}
                            </Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Buttons */}
                        <View style={styles.socialGrid}>
                            <TouchableOpacity
                                style={styles.googleButton}
                                onPress={handleGoogleSignIn}
                            >
                                <FAIcon name="google" size={18} color="#4285F4" style={styles.socialIcon} />
                                <Text style={styles.socialButtonText}>Google</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.appleButton}>
                                <FAIcon name="apple" size={20} color="white" style={styles.socialIcon} />
                                <Text style={styles.socialButtonTextWhite}>Apple</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                            <Text style={styles.footerText}>
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <Text style={styles.toggleText}>
                                    {isLogin ? 'Sign Up' : 'Login'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        position: 'absolute',
        left: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.primary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    brandingSection: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    logoContainer: {
        width: 52,
        height: 52,
        backgroundColor: '#FDECEC',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        paddingHorizontal: 30,
        lineHeight: 18,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        height: 48,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 15,
        marginTop: -5,
    },
    forgotPasswordText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    authButton: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    authButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 18,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    socialGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    googleButton: {
        flex: 0.48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    appleButton: {
        flex: 0.48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
        height: 48,
        borderRadius: 12,
    },
    socialButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    socialButtonTextWhite: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    socialIcon: {
        marginRight: 8,
    },
    footer: {
        marginTop: 'auto',
        paddingVertical: 15,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#64748B',
    },
    toggleText: {
        color: Colors.primary,
        fontWeight: '700',
    },
});

export default AuthScreen;
