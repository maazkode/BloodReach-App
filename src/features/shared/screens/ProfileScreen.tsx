import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { useAuth } from '../context/AuthContext';
import { subscribeToUser } from '../services/firestoreService';
import { UserDocument } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;
const { width } = Dimensions.get('window');
const capitalize = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

// ─── Info Row ──────────────────────────────────────────────────────────────

const InfoRow: React.FC<{
    icon: string;
    iconLib?: 'material' | 'community';
    label: string;
    value: string;
    iconBg: string;
    iconColor: string;
    isLast?: boolean;
}> = ({ icon, iconLib = 'community', label, value, iconBg, iconColor, isLast }) => (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
        <View style={[styles.infoIconBox, { backgroundColor: iconBg }]}>
            {iconLib === 'material' ? (
                <MaterialIcon name={icon as any} size={20} color={iconColor} />
            ) : (
                <MaterialCommunityIcon name={icon as any} size={20} color={iconColor} />
            )}
        </View>
        <View style={styles.infoText}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

// ─── Screen ────────────────────────────────────────────────────────────────

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!user) return;
        const unsub = subscribeToUser(user.uid, (data) => {
            setUserData(data);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <ActivityIndicator size="large" color="#B62022" />
            </View>
        );
    }

    const isAvailable = userData?.isAvailable ?? false;
    const role = capitalize(userData?.lastActiveRole);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── Hero ── */}
            <LinearGradient
                colors={['#C0282A', '#8B1214', '#5C0C0E']}
                style={[styles.hero, { paddingTop: insets.top }]}
            >
                {/* Decorative circles */}
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                {/* Top bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialIcon name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>My Profile</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn}>
                        <MaterialIcon name="edit" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Avatar */}
                <View style={styles.avatarShadow}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)']}
                        style={styles.avatarRing}
                    >
                        {userData?.photoURL ? (
                            <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <MaterialIcon name="person" size={50} color="#fff" />
                            </View>
                        )}
                    </LinearGradient>
                </View>

                {/* Name & email */}
                <Text style={styles.heroName}>{userData?.name || '—'}</Text>
                <Text style={styles.heroEmail}>{user?.email || '—'}</Text>

            </LinearGradient >

            {/* ── Floating Card ── */}
            < ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            >
                <View style={styles.floatingCard}>
                    <Text style={styles.cardTitle}>Contact & Details</Text>

                    <InfoRow
                        icon="phone-outline"
                        label="Phone Number"
                        value={userData?.phone || '—'}
                        iconBg="#EFF6FF"
                        iconColor="#3B82F6"
                    />
                    <InfoRow
                        icon="city-variant-outline"
                        label="City"
                        value={userData?.city || '—'}
                        iconBg="#F0FDF4"
                        iconColor="#10B981"
                    />
                    <InfoRow
                        icon="water"
                        label="Blood Group"
                        value={userData?.bloodGroup || '—'}
                        iconBg="#FEF2F2"
                        iconColor="#B62022"
                    />
                    <InfoRow
                        icon="cake-variant-outline"
                        label="Age"
                        value={userData?.age ? `${userData.age} Years` : '—'}
                        iconBg="#FEF9C3"
                        iconColor="#CA8A04"
                    />
                    <InfoRow
                        icon="calendar-check-outline"
                        label="Last Donation"
                        value={userData?.lastDonationDate
                            ? (userData.lastDonationDate as any).toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Never / Not Sure'}
                        iconBg="#F5F3FF"
                        iconColor="#7C3AED"
                        isLast
                    />
                </View>
            </ScrollView >
        </View >
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

    // Hero
    hero: {
        alignItems: 'center',
        paddingBottom: 35,
        overflow: 'hidden',
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },

    // Decorative
    decorCircle1: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -60,
        right: -60,
    },
    decorCircle2: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -30,
        left: -40,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        width: '100%',
        zIndex: 10,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Avatar
    avatarShadow: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 14,
        borderRadius: 50,
        marginBottom: 10,
    },
    avatarRing: {
        width: 98,
        height: 98,
        borderRadius: 49,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarFallback: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    heroName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    heroEmail: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
        fontWeight: '500',
        marginBottom: 10,
    },

    // Badges
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    heroBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    badgeSep: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },

    // Floating card
    floatingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
        marginTop: 20,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1.2,
        marginBottom: 8,
        textTransform: 'uppercase',
    },

    // Info Row
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    infoRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    infoIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoText: { flex: 1 },
    infoLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.4,
        marginBottom: 3,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
});

export default ProfileScreen;
