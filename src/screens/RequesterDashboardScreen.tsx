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
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { getUserDocument, createUserDocument } from '../services/firestoreService';
import { UserDocument } from '../types/database';
import { signOut } from '../services/authService';
import { Modal, Animated, Pressable } from 'react-native';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'RequesterDashboard'>;

const REQUESTS_DATA = [
    {
        id: '1',
        title: 'O Positive (O+)',
        units: '2 Units required',
        hospital: 'St. Mary\'s Hospital',
        status: ['EMERGENCY', 'WAITING'],
        time: '2h ago',
        bloodType: 'O+',
        matches: ['JD', '+1'],
        type: 'emergency'
    },
    {
        id: '2',
        title: 'A Negative (A-)',
        units: '1 Unit',
        hospital: 'Match Found',
        status: ['CONFIRMED'],
        time: '1 day ago',
        bloodType: 'A-',
        info: 'Donor arriving soon',
        type: 'confirmed'
    },
    {
        id: '3',
        title: 'B Positive (B+)',
        units: '3 Units',
        hospital: 'Request Fulfilled',
        status: ['CLOSED'],
        time: '4 days ago',
        bloodType: 'B+',
        type: 'closed'
    }
];

const RequesterDashboard: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const slideAnim = React.useRef(new Animated.Value(width * 0.75)).current;

    React.useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                const data = await getUserDocument(user.uid);
                setUserData(data);
            }
        };
        fetchUserData();
    }, [user]);

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
                toValue: width * 0.75,
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

    const renderStatusBadge = (status: string) => {
        let bgColor = '#F1F5F9';
        let textColor = '#64748B';
        let icon = null;

        if (status === 'EMERGENCY') {
            bgColor = '#FEE2E2';
            textColor = '#DC2626';
            icon = <MaterialIcon name="emergency" size={12} color="#DC2626" style={{ marginRight: 4 }} />;
        } else if (status === 'WAITING') {
            bgColor = '#FFEDD5';
            textColor = '#D97706';
        } else if (status === 'CONFIRMED') {
            bgColor = '#DCFCE7';
            textColor = '#16A34A';
        } else if (status === 'CLOSED') {
            bgColor = '#E2E8F0';
            textColor = '#64748B';
        }

        return (
            <View key={status} style={[styles.badge, { backgroundColor: bgColor }]}>
                {icon}
                <Text style={[styles.badgeText, { color: textColor }]}>{status}</Text>
            </View>
        );
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
                                    {userData?.name || 'Requester'}
                                </Text>
                                <Text style={styles.profileEmail} numberOfLines={1}>
                                    {user?.email || 'user@bloodreach.com'}
                                </Text>
                            </View>

                            <View style={styles.drawerBadgeRow}>
                                <View style={styles.bloodTypeBadge}>
                                    <Text style={styles.bloodTypeBadgeText}>{userData?.bloodGroup || '--'}</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusBadgeText}>REQUESTER</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.drawerItems}>
                            <TouchableOpacity
                                style={styles.drawerItem}
                                onPress={async () => {
                                    toggleDrawer(false);
                                    if (user) await createUserDocument({ uid: user.uid, lastActiveRole: 'donor' });
                                    navigation.replace('DonorDashboard');
                                }}
                            >
                                <MaterialIcon name="volunteer-activism" size={22} color={Colors.primary} />
                                <Text style={[styles.drawerItemText, { color: Colors.primary }]}>Switch to Donor Mode</Text>
                            </TouchableOpacity>
                            <View style={styles.drawerDivider} />

                            <TouchableOpacity style={styles.drawerItem}>
                                <MaterialIcon name="edit" size={22} color="#64748B" />
                                <Text style={styles.drawerItemText}>Edit Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.drawerItem}>
                                <MaterialIcon name="list-alt" size={22} color="#64748B" />
                                <Text style={styles.drawerItemText}>My Requests</Text>
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

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerInfo}>
                    <Image
                        source={{ uri: userData?.photoURL || 'https://i.pravatar.cc/100?u=user' }}
                        style={styles.avatar}
                    />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.userName}>{userData?.name?.split(' ')[0] || 'User'}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => toggleDrawer(true)} style={styles.notificationButton}>
                    <MaterialIcon name="menu" size={26} color="#475569" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            >
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
                        <Text style={[styles.statValue, { color: '#DC2626' }]}>02</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>PENDING UNITS</Text>
                        <Text style={[styles.statValue, { color: '#1E293B' }]}>03</Text>
                    </View>
                </View>

                {/* My Requests Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Requests</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {REQUESTS_DATA.map((item) => (
                    <TouchableOpacity activeOpacity={0.8} key={item.id} style={styles.requestCard}>
                        <View style={styles.cardMain}>
                            <View style={[styles.bloodBadge, item.type === 'closed' && styles.bloodBadgeClosed]}>
                                <Text style={[styles.bloodBadgeText, item.type === 'closed' && styles.bloodBadgeTextClosed]}>
                                    {item.bloodType}
                                </Text>
                            </View>
                            
                            <View style={styles.cardInfo}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.requestTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.timeText}>{item.time}</Text>
                                </View>
                                <Text style={styles.requestSub} numberOfLines={1}>
                                    {item.units} <Text style={styles.bullet}>•</Text> {item.hospital}
                                </Text>
                                <View style={styles.badgeRow}>
                                    {item.status.map(renderStatusBadge)}
                                </View>
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <View style={styles.footerLeft}>
                                {item.matches ? (
                                    <View style={styles.matchesRow}>
                                        <View style={styles.matchCircle}><Text style={styles.matchText}>JD</Text></View>
                                        <View style={[styles.matchCircle, { backgroundColor: '#FEE2E2', marginLeft: -8 }]}><Text style={[styles.matchText, { color: '#DC2626' }]}>+1</Text></View>
                                        <Text style={styles.matchLabel}>Matches found</Text>
                                    </View>
                                ) : item.info ? (
                                    <View style={styles.infoRow}>
                                        <View style={styles.greenDot} />
                                        <Text style={styles.infoText}>{item.info}</Text>
                                    </View>
                                ) : <View />}
                            </View>

                            <View style={styles.footerRight}>
                                <Text style={[
                                    styles.viewDetailsText,
                                    item.type === 'closed' && styles.viewDetailsTextOutline
                                ]}>View Details</Text>
                                <MaterialIcon 
                                    name="chevron-right" 
                                    size={20} 
                                    color={item.type === 'closed' ? '#94A3B8' : '#DC2626'} 
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Nav Bar */}
            <View style={[styles.navBar, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="home" size={28} color="#DC2626" />
                    <Text style={[styles.navText, { color: '#DC2626' }]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="list-alt" size={28} color="#94A3B8" />
                    <Text style={styles.navText}>My Requests</Text>
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
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'white',
    },
    headerInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E2E8F0' },
    headerTextContainer: { marginLeft: 12 },
    welcomeText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    userName: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    notificationButton: { padding: 5 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
    createRequestButton: {
        backgroundColor: '#DC2626',
        borderRadius: 10,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#DC2626',
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
    createRequestText: { color: 'white', fontSize: 17, fontWeight: '700' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    statCard: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    statValue: { fontSize: 28, fontWeight: '800' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: '#1E293B' },
    seeAllText: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
    requestCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 20,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F8FAFC',
    },
    cardMain: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    bloodBadge: {
        width: 56,
        height: 56,
        backgroundColor: '#FDECEC',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        marginRight: 16,
        marginTop: 4,
    },
    bloodBadgeClosed: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
    bloodBadgeText: { fontSize: 18, fontWeight: '800', color: '#DC2626' },
    bloodBadgeTextClosed: { color: '#94A3B8' },
    cardInfo: { flex: 1 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    requestTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', flex: 1, marginRight: 12 },
    timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    requestSub: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 12 },
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
        paddingTop: 16,
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
    viewDetailsText: { color: '#DC2626', fontWeight: '700', fontSize: 14, marginRight: 2 },
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
});

export default RequesterDashboard;
