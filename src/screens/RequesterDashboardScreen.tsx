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
import LoadingScreen from '../components/common/LoadingScreen';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../api/authService';
import { getUserDocument, getRequesterRequests, createUserDocument, subscribeToUser } from '../api/firestoreService';
import { UserDocument, DonationRequest } from '../types/database';
import BottomTabBar from '../components/common/BottomTabBar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';


const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'RequesterDashboard'>;
const StatusBadge = React.memo(({ status }: { status: string }) => {
    let bgColor = '#F1F5F9';
    let textColor = '#64748B';
    let icon = null;

    if (status === 'EMERGENCY') {
        bgColor = '#FEE2E2';
        textColor = '#B62022';
        icon = <MaterialIcon name="emergency" size={12} color="#B62022" style={{ marginRight: 4 }} />;
    } else if (status === 'WAITING') {
        bgColor = '#FFEDD5';
        textColor = '#D97706';
    } else if (status === 'MATCHED') {
        bgColor = '#DCFCE7';
        textColor = '#16A34A';
    } else if (status === 'CLOSED') {
        bgColor = '#E2E8F0';
        textColor = '#64748B';
    }

    return (
        <View style={[styles.badge, { backgroundColor: bgColor }]}>
            {icon}
            <Text style={[styles.badgeText, { color: textColor }]}>{status}</Text>
        </View>
    );
});

const RequestCard = React.memo(({ item, onPress }: { item: DonationRequest, onPress: (item: DonationRequest) => void }) => (
    <TouchableOpacity
        activeOpacity={0.8}
        style={styles.requestCard}
        onPress={() => onPress(item)}
    >
        <View style={styles.cardMain}>
            <View style={[styles.bloodBadge, item.status === 'completed' && styles.bloodBadgeClosed]}>
                <Text style={[styles.bloodBadgeText, item.status === 'completed' && styles.bloodBadgeTextClosed]}>
                    {item.bloodGroup}
                </Text>
            </View>

            <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                    <Text style={styles.requestTitle} numberOfLines={1}>{item.patientName}</Text>
                    <Text style={styles.timeText}>Recently</Text>
                </View>
                <Text style={styles.requestSub} numberOfLines={1}>
                    {item.unitsRequired} Unit{item.unitsRequired > 1 ? 's' : ''} <Text style={styles.bullet}>•</Text> {item.hospitalName}
                </Text>
                <View style={styles.badgeRow}>
                    {item.urgencyLevel === 'urgent' && <StatusBadge status="EMERGENCY" />}
                    {item.status === 'open' && <StatusBadge status="WAITING" />}
                    {item.status === 'matched' && <StatusBadge status="MATCHED" />}
                    {item.status === 'completed' && <StatusBadge status="CLOSED" />}
                </View>
            </View>
        </View>

        <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
                {item.matchedDonorIds && item.matchedDonorIds.length > 0 ? (
                    <View style={styles.matchesRow}>
                        <View style={styles.matchCircle}><Text style={styles.matchText}>{item.matchedDonorIds.length}</Text></View>
                        <Text style={styles.matchLabel}>Donor{item.matchedDonorIds.length > 1 ? 's' : ''} Found</Text>
                    </View>
                ) : item.status === 'completed' ? (
                    <Text style={[styles.matchLabel, { marginLeft: 0 }]}>Request Fulfilled</Text>
                ) : (
                    <View style={styles.infoRow}>
                        <View style={styles.greenDot} />
                        <Text style={styles.infoText}>Searching for donors...</Text>
                    </View>
                )}
            </View>

            <View style={styles.footerRight}>
                <Text style={[
                    styles.viewDetailsText,
                    item.status === 'completed' && styles.viewDetailsTextOutline
                ]}>View Details</Text>
                <MaterialIcon
                    name="chevron-right"
                    size={20}
                    color={item.status === 'completed' ? '#94A3B8' : '#B62022'}
                />
            </View>
        </View>
    </TouchableOpacity>
));

const RequesterDashboard: React.FC<Props> = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [myRequests, setMyRequests] = React.useState<DonationRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = React.useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState(route.params?.tab || 'home');
    const [loadingUser, setLoadingUser] = React.useState(true);

    // Sync activeTab when route.params.tab changes
    React.useEffect(() => {
        if (route.params?.tab) {
            setActiveTab(route.params.tab);
        }
    }, [route.params?.tab]);

    const activeMatchesCount = myRequests.filter(r => r.status === 'matched').length;
    const pendingUnitsTotal = myRequests
        .filter(r => r.status === 'open')
        .reduce((sum, r) => sum + (r.unitsRequired || 0), 0);

    React.useEffect(() => {
        if (!user) return;

        // 1. Subscribe to user profile real-time
        const unsubUser = subscribeToUser(user.uid, (data) => {
            if (data) {
                setUserData(data);
                setLoadingUser(false);
            } else {
                setLoadingUser(false);
            }
        });

        // 2. Listen for user's requests
        const unsubRequests = getRequesterRequests(user.uid, (requests) => {
            setMyRequests(requests);
            setLoadingRequests(false);
        });

        return () => {
            unsubUser();
            unsubRequests();
        };
    }, [user]);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };



    const handlePressRequest = React.useCallback((item: DonationRequest) => {
        navigation.navigate('RequestDetail', { requestId: item.id! });
    }, [navigation]);

    const renderRequestList = (list: DonationRequest[], emptyMsg: string) => {
        if (loadingRequests) {
            return <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />;
        }

        if (list.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <MaterialIcon name="post-add" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyText}>{emptyMsg}</Text>
                </View>
            );
        }

        return list.map((item) => <RequestCard key={item.id} item={item} onPress={handlePressRequest} />);
    };

    const tabContent = React.useMemo(() => {
        switch (activeTab) {
            case 'requests':
                return (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Active Requests</Text>
                        </View>
                        {renderRequestList(
                            myRequests.filter(r => r.status === 'open' || r.status === 'matched'),
                            "You have no active requests."
                        )}
                    </>
                );
            case 'history':
                return (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Request History</Text>
                        </View>
                        {renderRequestList(
                            myRequests.filter(r => r.status === 'completed' || r.status === 'cancelled'),
                            "Your request history is empty."
                        )}
                    </>
                );
            default: // home
                return (
                    <>
                        {/* Create Request Button */}
                        <TouchableOpacity
                            style={styles.createRequestButton}
                            onPress={() => navigation.navigate('CreateRequest')}
                        >
                            <View style={styles.plusCircle}>
                                <MaterialIcon name="add" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.createRequestText}>Create Blood Request</Text>
                        </TouchableOpacity>

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>ACTIVE MATCHES</Text>
                                <Text style={[styles.statValue, { color: '#B62022' }]}>
                                    {activeMatchesCount.toString().padStart(2, '0')}
                                </Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>PENDING UNITS</Text>
                                <Text style={[styles.statValue, { color: '#1E293B' }]}>
                                    {pendingUnitsTotal.toString().padStart(2, '0')}
                                </Text>
                            </View>
                        </View>

                        {/* My Requests Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Requests</Text>
                            <TouchableOpacity onPress={() => setActiveTab('requests')}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {renderRequestList(myRequests.slice(0, 5), "You haven't created any requests yet.")}
                    </>
                );
        }
    }, [activeTab, myRequests, activeMatchesCount, pendingUnitsTotal, loadingRequests]);

    if (loadingUser) {
        return <LoadingScreen tagline="Synchronizing your requester profile..." />;
    }

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerBrand}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerBrandName}>BloodReach</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            >
                {tabContent}
            </ScrollView>

            <BottomTabBar
                activeTab={activeTab}
                tabs={[
                    { key: 'home', label: 'Home', icon: 'home', activeIcon: 'home', onPress: () => setActiveTab('home') },
                    { key: 'requests', label: 'Requests', icon: 'list-alt', onPress: () => setActiveTab('requests') },
                    { key: 'history', label: 'History', icon: 'history', onPress: () => setActiveTab('history') },
                    { key: 'settings', label: 'Settings', icon: 'settings', activeIcon: 'settings', onPress: () => { setActiveTab('settings'); navigation.navigate('Settings'); } },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerBrand: { flexDirection: 'row', alignItems: 'center' },
    headerLogo: { width: 45, height: 45, marginRight: 8 },
    headerBrandName: { fontSize: 20, fontWeight: '900', color: '#000000', letterSpacing: 0.5 },
    menuButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
    createRequestButton: {
        backgroundColor: '#B62022',
        borderRadius: 10,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#B62022',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    plusCircle: {
        width: 32,
        height: 32,
        backgroundColor: 'white',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    createRequestText: { color: 'white', fontSize: 15, fontWeight: '700' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 },
    statValue: { fontSize: 24, fontWeight: '800' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: '#1E293B' },
    seeAllText: { fontSize: 14, color: '#B62022', fontWeight: '600' },
    requestCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#64748B',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 20,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F8FAFC',
    },
    cardMain: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    bloodBadge: {
        width: 44,
        height: 44,
        backgroundColor: '#FDECEC',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        marginRight: 12,
        marginTop: 2,
    },
    bloodBadgeClosed: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
    bloodBadgeText: { fontSize: 15, fontWeight: '800', color: '#B62022' },
    bloodBadgeTextClosed: { color: '#94A3B8' },
    cardInfo: { flex: 1 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    requestTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', flex: 1, marginRight: 10 },
    timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    requestSub: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 10 },
    bullet: { marginHorizontal: 6, color: '#CBD5E1' },
    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerLeft: { flex: 1 },
    footerRight: { flexDirection: 'row', alignItems: 'center' },
    matchesRow: { flexDirection: 'row', alignItems: 'center' },
    matchCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    matchText: { fontSize: 11, fontWeight: '800', color: '#1E293B' },
    matchLabel: { marginLeft: 10, fontSize: 13, color: '#64748B', fontWeight: '600' },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
    infoText: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
    viewDetailsText: { color: '#B62022', fontWeight: '700', fontSize: 14, marginRight: 2 },
    viewDetailsTextOutline: { color: '#94A3B8' },
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
    navText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 4 },
    // Side Drawer Styles
    modalOverlayOuter: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
    drawerContainer: {
        width: width * 0.75,
        height: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderBottomLeftRadius: 30,
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
        backgroundColor: '#B62022',
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 15,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center',
    },
});

export default RequesterDashboard;



