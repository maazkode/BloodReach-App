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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getUserDocument, createUserDocument, subscribeToRequests, subscribeToMatchingRequests } from '../services/firestoreService';
import { UserDocument, DonationRequest } from '../types/database';
import { signOut } from '../services/authService';
import { triggerLocalNotification } from '../services/notificationService';
import { Modal, Animated, Pressable, ActivityIndicator } from 'react-native';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'DonorDashboard'>;

const STATS_DATA = [
    {
        id: 1,
        label: 'DONATIONS',
        value: '5',
        subtext: 'Total lifetime',
        icon: 'volunteer-activism'
    },
    {
        id: 2,
        label: 'LIVES SAVED',
        value: '15',
        subtext: 'Impact estimated',
        icon: 'favorite'
    },
];

// Placeholder images for aesthetic consistency
const REQUEST_IMAGES = [
    'https://images.unsplash.com/photo-1587350859728-4476654a1809?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579154235828-4519939f9392?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1538108197017-c1a966bd7b3f?q=80&w=2024&auto=format&fit=crop'
];

const DonorDashboard: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [nearbyRequests, setNearbyRequests] = React.useState<DonationRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = React.useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const slideAnim = React.useRef(new Animated.Value(-width * 0.75)).current;

    React.useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const data = await getUserDocument(user.uid);
                setUserData(data);
            }
        };
        fetchUserData();

        // Subscribe to real-time requests for the dashboard
        const unsubscribe = subscribeToRequests((requests) => {
            setNearbyRequests(requests.slice(0, 5)); // Just show top 5 on dashboard
            setLoadingRequests(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Separate effect for matching request notifications
    React.useEffect(() => {
        if (!userData || !userData.bloodGroup || !userData.city) return;

        console.log(`Starting matching listener for ${userData.bloodGroup} in ${userData.city}`);
        
        const unsubscribeMatching = subscribeToMatchingRequests(
            userData.bloodGroup,
            userData.city,
            (newRequest) => {
                triggerLocalNotification(
                    'Urgent Blood Request!',
                    `A new ${newRequest.bloodGroup} request has been posted in ${newRequest.city}.`,
                    newRequest.id
                );
            }
        );

        return () => unsubscribeMatching();
    }, [userData?.bloodGroup, userData?.city]);

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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Sidebar Drawer Modal */}
            <Modal
                transparent
                visible={isDrawerOpen}
                onRequestClose={() => toggleDrawer(false)}
                animationType="none"
            >
                <View style={styles.modalOverlayOuter}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => toggleDrawer(false)}
                    />
                    <Animated.View
                        style={[
                            styles.drawerContainer,
                            { transform: [{ translateX: slideAnim }] }
                        ]}
                    >
                        <View style={[styles.drawerHeader, { paddingTop: insets.top + 20 }]}>
                            <View style={styles.profileSection}>
                                <View style={styles.profileImageContainer}>
                                    {userData?.photoURL ? (
                                        <Image source={{ uri: userData.photoURL }} style={styles.profileImage} />
                                    ) : (
                                        <MaterialIcon name="person" size={40} color={Colors.primary} />
                                    )}
                                </View>
                                <Text style={styles.profileName} numberOfLines={1}>
                                    {userData?.name || 'Blood Donor'}
                                </Text>
                                <Text style={styles.profileEmail} numberOfLines={1}>
                                    {user?.email || 'donor@bloodreach.com'}
                                </Text>
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
                                <MaterialIcon name="swap-horiz" size={22} color={Colors.primary} />
                                <Text style={[styles.drawerItemText, { color: Colors.primary }]}>Switch to Requester Mode</Text>
                            </TouchableOpacity>
                            <View style={styles.drawerDivider} />
                            
                            <TouchableOpacity style={styles.drawerItem}>
                                <MaterialIcon name="edit" size={22} color="#64748B" />
                                <Text style={styles.drawerItemText}>Edit Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.drawerItem}>
                                <MaterialIcon name="history" size={22} color="#64748B" />
                                <Text style={styles.drawerItemText}>Donation History</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.drawerItem}>
                                <MaterialIcon name="settings" size={22} color="#64748B" />
                                <Text style={styles.drawerItemText}>Settings</Text>
                            </TouchableOpacity>
                            <View style={styles.drawerDivider} />
                            <TouchableOpacity style={styles.drawerItem} onPress={handleLogout}>
                                <MaterialIcon name="logout" size={22} color="#EF4444" />
                                <Text style={[styles.drawerItemText, { color: '#EF4444' }]}>Logout</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </Animated.View>
                </View>
            </Modal>

            {/* Top Navbar */}
            <View style={[styles.navbar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => toggleDrawer(true)}>
                    <MaterialIcon name="menu" size={28} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.platformTitle}>BloodReach</Text>
                <TouchableOpacity>
                    <MaterialIcon name="notifications" size={26} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            >
                {/* Main Eligibility Card */}
                <View style={styles.eligibilityContainer}>
                    <LinearGradient
                        colors={['#DC2626', '#991B1B']}
                        style={styles.eligibilityCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.eligibilityHeader}>
                            <View style={styles.eligibleBadge}>
                                <View style={styles.greenDot} />
                                <Text style={styles.eligibleBadgeText}>ELIGIBLE</Text>
                            </View>
                            <MaterialIcon name="verified-user" size={24} color="white" />
                        </View>

                        <View style={styles.eligibilityBody}>
                            <Text style={styles.eligibilityTitle}>You are eligible to donate</Text>
                            <Text style={styles.eligibilitySub}>
                                Your last donation was over 56 days ago. You can save up to 3 lives today.
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.scheduleButton}>
                            <Text style={styles.scheduleButtonText}>Schedule Donation</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* Impact/Stats Row */}
                <View style={styles.statsRow}>
                    {STATS_DATA.map((item) => (
                        <View key={item.id} style={styles.statCard}>
                            <View style={styles.statHeader}>
                                <MaterialIcon name={item.icon} size={20} color="#DC2626" />
                                <Text style={styles.statLabel}>{item.label}</Text>
                            </View>
                            <Text style={styles.statValue}>{item.value}</Text>
                            <Text style={styles.statSub}>{item.subtext}</Text>
                        </View>
                    ))}
                </View>

                {/* Nearby Requests Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Nearby Blood Requests</Text>
                </View>

                {loadingRequests ? (
                    <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestsList}>
                        {nearbyRequests.length > 0 ? (
                            nearbyRequests.map((item: DonationRequest, index: number) => (
                                <View key={item.id} style={styles.requestCard}>
                                    <View style={styles.requestImageContainer}>
                                        <Image 
                                            source={{ uri: REQUEST_IMAGES[index % REQUEST_IMAGES.length] }} 
                                            style={styles.requestImage} 
                                        />
                                        <View style={styles.emergencyBadge}>
                                            <MaterialIcon name="priority-high" size={12} color="white" />
                                            <Text style={styles.emergencyText}>
                                                {item.urgencyLevel === 'urgent' ? 'EMERGENCY' : 'BLOOD NEEDED'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.requestInfo}>
                                        <View style={styles.typeRow}>
                                            <Text style={styles.bloodType}>{item.bloodGroup}</Text>
                                            <View style={styles.distanceBadge}>
                                                <Text style={styles.distanceText}>{item.city}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.hospitalName} numberOfLines={1}>{item.hospitalName}</Text>
                                        <Text style={styles.reasonText} numberOfLines={1}>For {item.patientName}</Text>

                                        <TouchableOpacity 
                                            style={styles.viewDetailsBtn}
                                            onPress={() => navigation.navigate('RequestDetail', { requestId: item.id! })}
                                        >
                                            <Text style={styles.viewDetailsBtnText}>Help Now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyRequestsBox}>
                                <MaterialCommunityIcon name="water-off" size={40} color="#E2E8F0" />
                                <Text style={styles.emptyRequestsText}>No active requests nearby</Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                {/* Future Window Info */}
                <View style={styles.futureContainer}>
                    <View style={styles.futureCard}>
                        <View style={styles.calendarIconBox}>
                            <MaterialIcon name="calendar-today" size={24} color="#64748B" />
                        </View>
                        <View style={styles.futureInfo}>
                            <View style={styles.futureBadge}>
                                <Text style={styles.futureBadgeText}>FUTURE DATE</Text>
                            </View>
                            <Text style={styles.futureTitle}>
                                Next eligibility window opens after your planned donation cycle ends.
                            </Text>
                            <Text style={styles.futureDateText}>Next window: March 25, 2026</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="home" size={28} color="#DC2626" />
                    <Text style={[styles.navText, { color: '#DC2626' }]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="water-drop" size={28} color="#94A3B8" />
                    <Text style={styles.navText}>Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="history" size={28} color="#94A3B8" />
                    <Text style={styles.navText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <MaterialIcon name="person" size={28} color="#94A3B8" />
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'white',
        paddingBottom: 15
    },
    platformTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
    scrollContent: { paddingTop: 10 },
    eligibilityContainer: { paddingHorizontal: 20, marginBottom: 25 },
    eligibilityCard: { borderRadius: 24, padding: 24 },
    eligibilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    eligibleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
    eligibleBadgeText: { color: 'white', fontSize: 12, fontWeight: '800' },
    eligibilityBody: { marginBottom: 25 },
    eligibilityTitle: { color: 'white', fontSize: 26, fontWeight: '800', marginBottom: 8 },
    eligibilitySub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22 },
    scheduleButton: { backgroundColor: 'white', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    scheduleButtonText: { color: '#DC2626', fontSize: 17, fontWeight: '700' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30 },
    statCard: {
        width: (width - 55) / 2,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 15
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    statLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 8 },
    statValue: { fontSize: 32, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    statSub: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    seeAllText: { fontSize: 15, color: '#DC2626', fontWeight: '600' },
    requestsList: { paddingLeft: 20, paddingBottom: 15 },
    requestCard: {
        width: 260,
        backgroundColor: 'white',
        borderRadius: 24,
        marginRight: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        overflow: 'hidden'
    },
    requestImageContainer: { position: 'relative' },
    requestImage: { width: '100%', height: 140 },
    emergencyBadge: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: '#DC2626',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    emergencyText: { color: 'white', fontSize: 11, fontWeight: '800', marginLeft: 4 },
    requestInfo: { padding: 16 },
    typeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    bloodType: { fontSize: 22, fontWeight: '800', color: '#DC2626' },
    distanceBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    distanceText: { fontSize: 12, fontWeight: '700', color: '#475569' },
    hospitalName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    reasonText: { fontSize: 14, color: '#64748B', marginBottom: 16, fontWeight: '500' },
    viewDetailsBtn: { backgroundColor: '#FDECEC', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    viewDetailsBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
    futureContainer: { paddingHorizontal: 20, marginBottom: 20 },
    futureCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    calendarIconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    futureInfo: { flex: 1 },
    futureBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
    futureBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    futureTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', lineHeight: 22, marginBottom: 8 },
    futureDateText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
    bottomNavBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    navItem: { alignItems: 'center' },
    navText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 4 },
    // Side Drawer Styles
    modalOverlayOuter: { flex: 1, flexDirection: 'row' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
    drawerContainer: {
        width: width * 0.75,
        height: '100%',
        backgroundColor: 'white',
        borderTopRightRadius: 30,
        borderBottomRightRadius: 30,
        paddingHorizontal: 20,
        elevation: 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 25,
    },
    drawerHeader: { paddingVertical: 30, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    profileSection: { marginBottom: 20 },
    profileImageContainer: {
        width: 70,
        height: 70,
        borderRadius: 22,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#FEE2E2',
    },
    profileImage: { width: '100%', height: '100%', borderRadius: 20 },
    profileName: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    profileEmail: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    drawerBadgeRow: { flexDirection: 'row', alignItems: 'center' },
    bloodTypeBadge: {
        backgroundColor: '#DC2626',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        marginRight: 10,
    },
    bloodTypeBadgeText: { color: 'white', fontSize: 14, fontWeight: '800' },
    statusBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    drawerItems: { marginTop: 25 },
    drawerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        marginBottom: 8,
    },
    drawerItemText: { fontSize: 15, fontWeight: '600', color: '#475569', marginLeft: 14 },
    drawerDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
    versionText: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    emptyRequestsBox: {
        width: 260,
        height: 180,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
    },
    emptyRequestsText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
    },
});

export default DonorDashboard;
