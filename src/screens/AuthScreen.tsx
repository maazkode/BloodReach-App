import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const AuthScreen = () => {
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('signup');
    const [role, setRole] = useState<'donor' | 'recipient' | 'hospital'>('donor');

    const RoleCard = ({
        type,
        title,
        subtitle,
        icon,
        selected
    }: {
        type: 'donor' | 'recipient' | 'hospital',
        title: string,
        subtitle: string,
        icon: string,
        selected: boolean
    }) => {
        const getBgColor = () => {
            if (type === 'donor') return Colors.donorLight;
            if (type === 'recipient') return Colors.recipientLight;
            return Colors.hospitalLight;
        };

        const getBorderColor = () => {
            if (!selected) return Colors.border;
            if (type === 'donor') return Colors.primary;
            if (type === 'recipient') return Colors.info;
            return Colors.success;
        };

        return (
            <TouchableOpacity
                style={[
                    styles.roleCard,
                    { backgroundColor: 'white', borderColor: getBorderColor(), borderWidth: selected ? 1.5 : 1 }
                ]}
                onPress={() => setRole(type)}
            >
                <View style={[styles.roleIconContainer, { backgroundColor: getBgColor() }]}>
                    <Text style={styles.roleIconText}>{icon}</Text>
                </View>
                <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>{title}</Text>
                    <Text style={styles.roleSubtitle}>{subtitle}</Text>
                </View>
                {selected && (
                    <View style={[styles.checkbox, { backgroundColor: type === 'donor' ? Colors.primary : type === 'recipient' ? Colors.info : Colors.success }]}>
                        <Text style={styles.checkMark}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>BloodConnect</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroSection}>
                    <Text style={styles.title}>Connecting Lifesavers</Text>
                    <Text style={styles.subtitle}>Join the network that saves lives in real-time.</Text>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                        onPress={() => setActiveTab('login')}
                    >
                        <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Log In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                        onPress={() => setActiveTab('signup')}
                    >
                        <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>Sign Up</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select your role</Text>
                    <RoleCard
                        type="donor"
                        title="Donor"
                        subtitle="I want to donate blood"
                        icon="❤️"
                        selected={role === 'donor'}
                    />
                    <RoleCard
                        type="recipient"
                        title="Recipient"
                        subtitle="I need blood request"
                        icon="📈"
                        selected={role === 'recipient'}
                    />
                    <RoleCard
                        type="hospital"
                        title="Hospital / Bank"
                        subtitle="Medical Partner"
                        icon="➕"
                        selected={role === 'hospital'}
                    />
                </View>

                <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email or Phone Number</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>✉️</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="jane@example.com"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>🔒</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor="#999"
                                secureTextEntry
                            />
                            <TouchableOpacity>
                                <Text style={styles.eyeIcon}>👁️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Create Account</Text>
                        <Text style={styles.buttonArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialContainer}>
                    <TouchableOpacity style={styles.socialButton}>
                        <Text style={styles.socialIcon}>G</Text>
                        <Text style={styles.socialButtonText}>Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                        <Text style={styles.socialIcon}>🍎</Text>
                        <Text style={styles.socialButtonText}>Apple</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        By creating an account, you agree to our{' '}
                        <Text style={styles.linkText}>Privacy Policy</Text> regarding sensitive health data.
                    </Text>

                    <View style={styles.badge}>
                        <Text style={styles.badgeIcon}>🛡️</Text>
                        <Text style={styles.badgeText}>HIPAA COMPLIANT SECURE</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    backArrow: {
        fontSize: 24,
        color: Colors.black,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.black,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    heroSection: {
        marginTop: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.black,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#999',
    },
    activeTabText: {
        color: Colors.primary,
    },
    section: {
        marginTop: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.black,
        marginBottom: 15,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    roleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleIconText: {
        fontSize: 20,
    },
    roleTextContainer: {
        flex: 1,
        marginLeft: 15,
    },
    roleTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.black,
    },
    roleSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkMark: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    formSection: {
        marginTop: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.black,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 12,
        height: 54,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.black,
    },
    eyeIcon: {
        fontSize: 18,
        color: '#999',
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        marginTop: 10,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    buttonArrow: {
        color: 'white',
        fontSize: 18,
        marginLeft: 8,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#EEE',
    },
    dividerText: {
        marginHorizontal: 10,
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    socialButton: {
        flex: 0.48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: 'white',
    },
    socialIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.black,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    linkText: {
        color: Colors.primary,
        fontWeight: '600',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8FBF4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 20,
    },
    badgeIcon: {
        fontSize: 14,
        marginRight: 5,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#00A86B',
        letterSpacing: 0.5,
    },
});

export default AuthScreen;
