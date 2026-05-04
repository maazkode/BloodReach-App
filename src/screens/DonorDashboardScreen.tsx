import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Dimensions,
    Modal,
    Animated,
    Pressable,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { 
    getUserDocument, 
    createUserDocument, 
    subscribeToRequests, 
    subscribeToNearbyRequests,
    subscribeToMatchingRequests, 
    checkAndRefreshEligibility,
    getActiveDonorMatches
} from '../services/firestoreService';
import { UserDocument, DonationRequest } from '../types/database';
import { signOut } from '../services/authService';
import { triggerLocalNotification } from '../services/notificationService';
import BottomTabBar from '../components/BottomTabBar';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'DonorDashboard'>;

const DonorDashboard: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [nearbyRequests, setNearbyRequests] = React.useState<DonationRequest[]>([]);
    const [activeHelps, setActiveHelps] = React.useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = React.useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('home');

    // Effect for active matches
    React.useEffect(() => {
        if (!user) return;
        const unsubMatches = getActiveDonorMatches(user.uid, (matches) => {
            setActiveHelps(matches);
        });
        return () => unsubMatches();
    }, [user]);

    React.useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const data = await checkAndRefreshEligibility(user.uid);
                setUserData(data);
            }
        };
        fetchUserData();

        let unsubscribe: () => void = () => {};

        // Only subscribe to nearby filtered requests if the user is AVAILABLE and ELIGIBLE
        if (userData?.location?.latitude && userData?.location?.longitude && userData?.isAvailable && userData?.isEligibleToDonate) {
            console.log(`Subscribing to NEARBY requests (10KM) for ${userData.bloodGroup}...`);
            unsubscribe = subscribeToNearbyRequests(
                userData.location.latitude,
                userData.location.longitude,
                10, // 10KM radius for dashboard
                userData.bloodGroup || null,
                (requests) => {
                    const activeRequestIds = activeHelps.map(m => m.requestId);
                    const filtered = requests.filter(r => 
                        r.requesterId !== user?.uid && 
                        !activeRequestIds.includes(r.id!) &&
                        (!userData?.bloodGroup || r.bloodGroup === userData.bloodGroup)
                    );
                    setNearbyRequests(filtered.slice(0, 10));
                    setLoadingRequests(false);
                }
            );
        } else {
            console.log('Subscribing to GLOBAL requests (no location)...');
            unsubscribe = subscribeToRequests((requests) => {
                const activeRequestIds = activeHelps.map(m => m.requestId);
                const filtered = requests.filter(r => 
                    r.requesterId !== user?.uid && 
                    !activeRequestIds.includes(r.id!) &&
                    (!userData?.bloodGroup || r.bloodGroup === userData.bloodGroup)
                );
                setNearbyRequests(filtered.slice(0, 5));
                setLoadingRequests(false);
            });
        }

        return () => unsubscribe();
    }, [user, userData?.location?.latitude, userData?.location?.longitude, activeHelps]);

    // Separate effect for matching request notifications
    React.useEffect(() => {
        if (!userData || !userData.bloodGroup || !userData.location || !userData.isEligibleToDonate || !userData.isAvailable) return;

        console.log(`Starting matching listener for ${userData.bloodGroup} within 10KM`);

        const unsubscribeMatching = subscribeToMatchingRequests(
            userData.bloodGroup,
            userData.location.latitude,
            userData.location.longitude,
            (newRequest) => {
                triggerLocalNotification(
                    'Urgent Blood Request!',
                    `A new ${newRequest.bloodGroup} request has been posted nearby.`,
                    newRequest.id
                );
            }
        );

        return () => unsubscribeMatching();
    }, [userData?.bloodGroup, userData?.location?.latitude, userData?.location?.longitude, userData?.isEligibleToDonate]);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getUrgencyColor = (level: string) => level === 'urgent' ? '#B62022' : '#D97706';
    const getUrgencyBg = (level: string) => level === 'urgent' ? '#FEE2E2' : '#FEF3C7';
    const getUrgencyLabel = (level: string) => level === 'urgent' ? 'EMERGENCY' : 'NEEDED';

    const formatCooldownDate = (timestamp: any) => {
        if (!timestamp) return 'Available Now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* ── Header ── */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerBrand}>
                    <Image source={require('../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                    <Text style={styles.headerBrandName}>BloodReach</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            >
                {/* ── Eligibility Hero Card ── */}
                <View style={[styles.heroCard, userData?.isEligibleToDonate === false && styles.heroCardCooldown]}>
                    <View style={styles.heroTopRow}>
                        <View style={[styles.eligiblePill, userData?.isEligibleToDonate === false && styles.cooldownPill]}>
                            <View style={[styles.greenDot, userData?.isEligibleToDonate === false && styles.redDot]} />
                            <Text style={[styles.eligiblePillText, userData?.isEligibleToDonate === false && styles.cooldownPillText]}>
                                {userData?.isEligibleToDonate === false ? 'NOT MEDICALLY FIT' : (userData?.isAvailable ? 'ACTIVE & ELIGIBLE' : 'OFFLINE')}
                            </Text>
                        </View>
                        <View style={styles.bloodGroupCircle}>
                            <Text style={styles.bloodGroupCircleText}>{userData?.bloodGroup || 'A+'}</Text>
                        </View>
                    </View>
                    <Text style={styles.heroTitle}>
                        {userData?.isEligibleToDonate === false ? 'Recovery Mode' : 'You\'re ready\nto save lives'}
                    </Text>
                    <Text style={styles.heroSub}>
                        {userData?.isEligibleToDonate === false
                            ? `You can donate again after ${userData.donationCooldownUntil ? (userData.donationCooldownUntil as any).toDate().toLocaleDateString() : 'the cooldown period'}.`
                            : 'Thank you for your life-saving contributions. Each donation can save up to 3 lives.'}
                    </Text>
                    {userData?.isEligibleToDonate !== false && (
                        <TouchableOpacity style={styles.scheduleBtn}>
                            <MaterialIcon name="event-available" size={18} color="#B62022" style={{ marginRight: 8 }} />
                            <Text style={styles.scheduleBtnText}>Schedule a Donation</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Active Helps (Ongoing Donations) ── */}

                {/* ── Active Helps (Ongoing Donations) ── */}
                {activeHelps.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center' }]}>
                            <Text style={styles.sectionTitle}>Active Helps</Text>
                            <View style={styles.activeCountBadge}>
                                <Text style={styles.activeCountText}>{activeHelps.length}</Text>
                            </View>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestsScroll}>
                            {activeHelps.map((match) => (
                                <TouchableOpacity
                                    key={match.id}
                                    style={[styles.requestCard, styles.activeMatchCard]}
                                    onPress={() => navigation.navigate('DonorHelpDetail', { requestId: match.requestId })}
                                >
                                    <View style={styles.requestCardTop}>
                                        <View style={styles.requestBloodBadge}>
                                            <Text style={styles.requestBloodText}>{match.request?.bloodGroup || '--'}</Text>
                                        </View>
                                        <View style={[styles.statusTag, { backgroundColor: match.status === 'accepted' ? '#DCFCE7' : '#F1F5F9' }]}>
                                            <Text style={[styles.statusTagText, { color: match.status === 'accepted' ? '#16A34A' : '#64748B' }]}>
                                                {match.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <Text style={styles.requestHospital} numberOfLines={1} ellipsizeMode="tail">{match.request?.hospitalName || 'Loading...'}</Text>
                                    <Text style={styles.requestPatient} numberOfLines={1} ellipsizeMode="tail">For {match.request?.patientName || 'Patient'}</Text>

                                    <View style={styles.requestMeta}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <MaterialIcon name="location-on" size={14} color="#94A3B8" />
                                            <Text style={styles.requestMetaText} numberOfLines={1} ellipsizeMode="tail">{match.request?.city || 'Location'}</Text>
                                        </View>
                                        <View style={styles.unitBadge}>
                                            <MaterialCommunityIcon name="water" size={12} color="#B62022" />
                                            <Text style={styles.unitBadgeText}>{match.request?.unitsRequired || 0} Unit{match.request?.unitsRequired !== 1 ? 's' : ''}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.helpBtn}>
                                        <Text style={styles.helpBtnText}>View Progress</Text>
                                        <MaterialIcon name="chevron-right" size={16} color="#B62022" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ── Nearby Requests ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Nearby Requests</Text>
                </View>

                {loadingRequests ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#B62022" />
                        <Text style={styles.loadingText}>Finding requests near you...</Text>
                    </View>
                ) : nearbyRequests.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestsScroll}>
                        {nearbyRequests.map((item: DonationRequest) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.requestCard}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('DonorHelpDetail', { requestId: item.id! })}
                            >
                                <View style={styles.requestCardTop}>
                                    <View style={styles.requestBloodBadge}>
                                        <Text style={styles.requestBloodText}>{item.bloodGroup}</Text>
                                    </View>
                                    <View style={[styles.urgencyTag, { backgroundColor: getUrgencyBg(item.urgencyLevel) }]}>
                                        <Text style={[styles.urgencyTagText, { color: getUrgencyColor(item.urgencyLevel) }]}>
                                            {getUrgencyLabel(item.urgencyLevel)}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.requestHospital} numberOfLines={1} ellipsizeMode="tail">{item.hospitalName}</Text>
                                <Text style={styles.requestPatient} numberOfLines={1} ellipsizeMode="tail">For {item.patientName}</Text>

                                <View style={styles.requestMeta}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <MaterialIcon name="location-on" size={14} color="#94A3B8" />
                                        <Text style={styles.requestMetaText} numberOfLines={1} ellipsizeMode="tail">{item.city}</Text>
                                    </View>
                                    <View style={styles.unitBadge}>
                                        <MaterialCommunityIcon name="water" size={12} color="#B62022" />
                                        <Text style={styles.unitBadgeText}>{item.unitsRequired} Unit{item.unitsRequired > 1 ? 's' : ''}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={[styles.helpBtn, !userData?.isEligibleToDonate && styles.helpBtnDisabled]}
                                    onPress={() => {
                                        if (userData?.isEligibleToDonate) {
                                            navigation.navigate('DonorHelpDetail', { requestId: item.id! });
                                        } else {
                                            Alert.alert("Cooldown Active", "You recently donated blood. You will be eligible to help again on " + formatCooldownDate(userData?.donationCooldownUntil));
                                        }
                                    }}
                                >
                                    <Text style={[styles.helpBtnText, !userData?.isEligibleToDonate && styles.helpBtnTextDisabled]}>
                                        {userData?.isEligibleToDonate ? 'Help Now' : 'In Cooldown'}
                                    </Text>
                                    <MaterialIcon name="chevron-right" size={16} color={userData?.isEligibleToDonate ? "#B62022" : "#94A3B8"} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcon name="water-off-outline" size={36} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No active requests nearby</Text>
                    </View>
                )}

                {/* ── Next Eligibility Card ── */}
                <View style={styles.nextCard}>
                    <View style={styles.nextIconBox}>
                        <MaterialIcon name="calendar-today" size={22} color="#64748B" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.nextLabel}>NEXT ELIGIBILITY WINDOW</Text>
                        <Text style={[styles.nextDate, userData?.isEligibleToDonate === false && styles.nextDateCooldown]}>
                            {userData?.isEligibleToDonate ? 'You are eligible now' : formatCooldownDate(userData?.donationCooldownUntil)}
                        </Text>
                        <Text style={styles.nextSub}>
                            {userData?.isEligibleToDonate 
                                ? 'Your health status allows you to save lives today.' 
                                : 'You are currently in a medical recovery period.'}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <BottomTabBar
                activeTab={activeTab}
                tabs={[
                    { key: 'home', label: 'Home', icon: 'home', activeIcon: 'home', onPress: () => setActiveTab('home') },
                    { key: 'requests', label: 'Requests', icon: 'water-drop', onPress: () => setActiveTab('requests') },
                    { key: 'history', label: 'History', icon: 'history', onPress: () => setActiveTab('history') },
                    { key: 'settings', label: 'Settings', icon: 'settings', activeIcon: 'settings', onPress: () => { setActiveTab('settings'); navigation.navigate('Settings'); } },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // ─── Header ───
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerIconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    headerBrand: { flexDirection: 'row', alignItems: 'center' },
    headerLogo: { width: 45, height: 45, marginRight: 8 },
    headerBrandName: { fontSize: 20, fontWeight: '900', color: '#000000', letterSpacing: 0.5 },

    scrollContent: { paddingTop: 20 },

    // ─── Hero Eligibility Card ───
    heroCard: {
        marginHorizontal: 16,
        backgroundColor: '#B62022',
        borderRadius: 20,
        padding: 22,
        marginBottom: 20,
    },
    heroCardCooldown: {
        backgroundColor: '#64748B', // Slate Grey for unfitness
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    eligiblePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    cooldownPill: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
    redDot: { backgroundColor: '#FBBF24' }, // Amber for Recovery Mode
    eligiblePillText: { color: 'white', fontSize: 11, fontWeight: '800' },
    cooldownPillText: { color: '#E2E8F0' },
    bloodGroupCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    bloodGroupCircleText: { color: 'white', fontSize: 15, fontWeight: '900' },
    heroTitle: { fontSize: 26, fontWeight: '900', color: 'white', lineHeight: 32, marginBottom: 10 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 20 },
    scheduleBtn: {
        backgroundColor: 'white',
        borderRadius: 10,
        height: 46,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scheduleBtnText: { color: '#B62022', fontSize: 15, fontWeight: '800' },

    // ─── Stats ───
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 24, gap: 10 },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 14,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },

    // ─── Section Header ───
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },

    // ─── Loading ───
    loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 30 },
    loadingText: { marginLeft: 12, fontSize: 14, color: '#94A3B8', fontWeight: '600' },

    // ─── Request Cards ───
    requestsScroll: { paddingLeft: 16, paddingBottom: 8 },
    requestCard: {
        width: 260,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 18,
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    requestCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    requestBloodBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    requestBloodText: { fontSize: 16, fontWeight: '900', color: '#B62022' },
    urgencyTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    urgencyTagText: { fontSize: 10, fontWeight: '900' },
    requestHospital: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
    requestPatient: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 16 },
    requestMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, justifyContent: 'space-between' },
    requestMetaText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 4, flexShrink: 1 },
    unitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    unitBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#B62022',
        marginLeft: 4,
    },
    helpBtn: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        height: 38,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpBtnDisabled: {
        backgroundColor: '#F1F5F9',
    },
    helpBtnText: { color: '#B62022', fontSize: 14, fontWeight: '800' },
    helpBtnTextDisabled: { color: '#94A3B8' },

    activeMatchCard: {
        borderColor: '#B62022',
        borderWidth: 1,
        backgroundColor: '#FFFBFB',
    },
    activeCountBadge: {
        backgroundColor: '#B62022',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    activeCountText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
    },
    statusTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusTagText: {
        fontSize: 10,
        fontWeight: '800',
    },

    // ─── Empty State ───
    emptyBox: {
        marginHorizontal: 16,
        height: 140,
        backgroundColor: 'white',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
        marginBottom: 24,
    },
    emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '600', marginTop: 10 },

    // ─── Next Eligibility Card ───
    nextCard: {
        marginHorizontal: 16,
        marginTop: 8,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    nextIconBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    nextLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
    nextDate: { fontSize: 16, fontWeight: '900', color: '#B62022', marginBottom: 2 },
    nextDateCooldown: { color: '#D97706' }, // Amber for cooldown date
    nextSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },

    // ─── Bottom Nav ───
    navBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    navItem: { alignItems: 'center' },
    navText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 3 },

    // ─── Drawer ───
    modalOverlayOuter: { flex: 1, flexDirection: 'row' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
    drawerContainer: {
        width: width * 0.75,
        height: '100%',
        backgroundColor: 'white',
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 20,
        elevation: 16,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 20,
    },
    drawerHeader: { paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 10 },
    drawerAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    drawerAvatarBox: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FEE2E2',
    },
    drawerAvatar: { width: '100%', height: '100%', borderRadius: 14 },
    drawerName: { fontSize: 17, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
    drawerEmail: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    drawerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bloodTypeBadge: {
        backgroundColor: '#B62022',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    bloodTypeBadgeText: { color: 'white', fontSize: 13, fontWeight: '800' },
    statusBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    drawerItems: { marginTop: 16 },
    drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginBottom: 4 },
    drawerIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    drawerItemText: { fontSize: 15, fontWeight: '700', color: '#475569' },
    drawerDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    versionText: { position: 'absolute', bottom: 30, left: 20, fontSize: 11, color: '#94A3B8', fontWeight: '600' },
});

export default DonorDashboard;
