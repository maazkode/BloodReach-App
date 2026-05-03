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
    checkAndRefreshEligibility 
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
    const [loadingRequests, setLoadingRequests] = React.useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('home');
    const slideAnim = React.useRef(new Animated.Value(-width * 0.75)).current;

    React.useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const data = await checkAndRefreshEligibility(user.uid);
                setUserData(data);
            }
        };
        fetchUserData();

        let unsubscribe: () => void = () => {};

        if (userData?.location?.latitude && userData?.location?.longitude) {
            console.log(`Subscribing to NEARBY requests (10KM) for ${userData.bloodGroup}...`);
            unsubscribe = subscribeToNearbyRequests(
                userData.location.latitude,
                userData.location.longitude,
                10, // 10KM radius for dashboard
                userData.bloodGroup || null,
                (requests) => {
                    const filtered = requests.filter(r => r.requesterId !== user?.uid);
                    setNearbyRequests(filtered.slice(0, 10));
                    setLoadingRequests(false);
                }
            );
        } else {
            console.log('Subscribing to GLOBAL requests (no location)...');
            unsubscribe = subscribeToRequests((requests) => {
                const filtered = requests.filter(r => r.requesterId !== user?.uid);
                setNearbyRequests(filtered.slice(0, 5));
                setLoadingRequests(false);
            });
        }

        return () => unsubscribe();
    }, [user, userData?.location?.latitude, userData?.location?.longitude]);

    // Separate effect for matching request notifications
    React.useEffect(() => {
        if (!userData || !userData.bloodGroup || !userData.location || !userData.isEligibleToDonate) return;

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

    const toggleDrawer = (open: boolean) => {
        if (open) {
            setIsDrawerOpen(true);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -width * 0.75,
                duration: 250,
                useNativeDriver: true,
            }).start(() => setIsDrawerOpen(false));
        }
    };

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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* ── Sidebar Drawer ── */}
            <Modal transparent visible={isDrawerOpen} onRequestClose={() => toggleDrawer(false)} animationType="none">
                <View style={styles.modalOverlayOuter}>
                    <Pressable style={styles.modalBackdrop} onPress={() => toggleDrawer(false)} />
                    <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
                        <View style={[styles.drawerHeader, { paddingTop: insets.top + 20 }]}>
                            <View style={styles.drawerAvatarRow}>
                                <View style={styles.drawerAvatarBox}>
                                    {userData?.photoURL ? (
                                        <Image source={{ uri: userData.photoURL }} style={styles.drawerAvatar} />
                                    ) : (
                                        <MaterialIcon name="person" size={34} color="#B62022" />
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.drawerName} numberOfLines={1}>{userData?.name || 'Blood Donor'}</Text>
                                    <Text style={styles.drawerEmail} numberOfLines={1}>{user?.email || 'donor@bloodreach.com'}</Text>
                                </View>
                            </View>
                            <View style={styles.drawerBadgeRow}>
                                <View style={styles.bloodTypeBadge}>
                                    <Text style={styles.bloodTypeBadgeText}>{userData?.bloodGroup || '--'}</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusBadgeText}>ACTIVE DONOR</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.drawerItems}>
                            <TouchableOpacity
                                style={styles.drawerItem}
                                onPress={async () => {
                                    toggleDrawer(false);
                                    if (user) await createUserDocument({ uid: user.uid, lastActiveRole: 'requester' });
                                    navigation.replace('RequesterDashboard');
                                }}
                            >
                                <View style={[styles.drawerIconBox, { backgroundColor: '#FEE2E2' }]}>
                                    <MaterialIcon name="swap-horiz" size={20} color="#B62022" />
                                </View>
                                <Text style={[styles.drawerItemText, { color: '#B62022' }]}>Switch to Requester</Text>
                            </TouchableOpacity>

                            <View style={styles.drawerDivider} />

                            <TouchableOpacity style={styles.drawerItem}>
                                <View style={styles.drawerIconBox}>
                                    <MaterialIcon name="edit" size={20} color="#64748B" />
                                </View>
                                <Text style={styles.drawerItemText}>Edit Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.drawerItem}>
                                <View style={styles.drawerIconBox}>
                                    <MaterialIcon name="history" size={20} color="#64748B" />
                                </View>
                                <Text style={styles.drawerItemText}>Donation History</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.drawerItem}>
                                <View style={styles.drawerIconBox}>
                                    <MaterialIcon name="settings" size={20} color="#64748B" />
                                </View>
                                <Text style={styles.drawerItemText}>Settings</Text>
                            </TouchableOpacity>

                            <View style={styles.drawerDivider} />

                            <TouchableOpacity style={styles.drawerItem} onPress={handleLogout}>
                                <View style={[styles.drawerIconBox, { backgroundColor: '#FEF2F2' }]}>
                                    <MaterialIcon name="logout" size={20} color="#EF4444" />
                                </View>
                                <Text style={[styles.drawerItemText, { color: '#EF4444' }]}>Logout</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </Animated.View>
                </View>
            </Modal>

            {/* ── Header ── */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerBrand}>
                    <Image source={require('../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                    <Text style={styles.headerBrandName}>BloodReach</Text>
                </View>
                <TouchableOpacity onPress={() => toggleDrawer(true)} style={styles.headerIconBtn}>
                    <MaterialIcon name="menu" size={24} color="#1E293B" />
                </TouchableOpacity>
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
                                {userData?.isEligibleToDonate === false ? 'COOLDOWN PERIOD' : 'ELIGIBLE NOW'}
                            </Text>
                        </View>
                        <View style={styles.bloodGroupCircle}>
                            <Text style={styles.bloodGroupCircleText}>{userData?.bloodGroup || 'A+'}</Text>
                        </View>
                    </View>
                    <Text style={styles.heroTitle}>
                        {userData?.isEligibleToDonate === false ? 'Time to recover' : 'You\'re ready\nto save lives'}
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

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={styles.statIconBox}>
                            <MaterialIcon name="volunteer-activism" size={20} color="#B62022" />
                        </View>
                        <Text style={styles.statValue}>5</Text>
                        <Text style={styles.statLabel}>Donations</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#fff' }]}>
                            <MaterialIcon name="favorite" size={20} color="#B62022" />
                        </View>
                        <Text style={[styles.statValue, { color: '#B62022' }]}>15</Text>
                        <Text style={styles.statLabel}>Lives Saved</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIconBox}>
                            <MaterialIcon name="emoji-events" size={20} color="#B62022" />
                        </View>
                        <Text style={styles.statValue}>Gold</Text>
                        <Text style={styles.statLabel}>Rank</Text>
                    </View>
                </View>

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

                                <Text style={styles.requestHospital} numberOfLines={1}>{item.hospitalName}</Text>
                                <Text style={styles.requestPatient} numberOfLines={1}>For {item.patientName}</Text>

                                <View style={styles.requestMeta}>
                                    <MaterialIcon name="location-on" size={13} color="#94A3B8" />
                                    <Text style={styles.requestMetaText}>{item.city}</Text>
                                    <Text style={styles.requestMetaDot}>•</Text>
                                    <Text style={styles.requestMetaText}>{item.unitsRequired} unit{item.unitsRequired > 1 ? 's' : ''}</Text>
                                </View>

                                <View style={styles.helpBtn}>
                                    <Text style={styles.helpBtnText}>Help Now</Text>
                                    <MaterialIcon name="chevron-right" size={16} color="#B62022" />
                                </View>
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
                        <Text style={styles.nextDate}>March 25, 2026</Text>
                        <Text style={styles.nextSub}>Your planned donation cycle ends then.</Text>
                    </View>
                </View>
            </ScrollView>

            <BottomTabBar
                activeTab={activeTab}
                tabs={[
                    { key: 'home', label: 'Home', icon: 'home', activeIcon: 'home', onPress: () => setActiveTab('home') },
                    { key: 'requests', label: 'Requests', icon: 'water-drop', onPress: () => setActiveTab('requests') },
                    { key: 'donate', label: 'Donate', icon: 'favorite', isFab: true, onPress: () => setActiveTab('donate') },
                    { key: 'history', label: 'History', icon: 'history', onPress: () => setActiveTab('history') },
                    { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', onPress: () => { setActiveTab('profile'); navigation.navigate('Profile'); } },
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
        backgroundColor: '#64748B',
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
    redDot: { backgroundColor: '#F87171' },
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
        width: 220,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
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
    requestHospital: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    requestPatient: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 12 },
    requestMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    requestMetaText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
    requestMetaDot: { marginHorizontal: 6, color: '#CBD5E1', fontSize: 12 },
    helpBtn: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        height: 38,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpBtnText: { color: '#B62022', fontSize: 14, fontWeight: '800' },

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
