import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Alert,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../api/authService';
import { getUserDocument, getDonorStats, createUserDocument, subscribeToUser } from '../api/firestoreService';
import { UserDocument } from '../types/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import LinearGradient from 'react-native-linear-gradient';
import { safeRun, log } from '../utility/errorHandler';
import { useModal } from '../context/ModalContext';
import BottomTabBar from '../components/common/BottomTabBar';
import LoadingScreen from '../components/common/LoadingScreen';


const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const MenuOption = React.memo(({ icon, title, color = "#1E293B", onPress, isLast = false, rightText }: any) => (
    <TouchableOpacity
        style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.menuIconBox, { backgroundColor: `${color}10` }]}>
            <MaterialCommunityIcon name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.menuTitle, { color }]}>{title}</Text>
        {rightText && <Text style={styles.rightText}>{rightText}</Text>}
        <MaterialIcon name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
));

const InfoRow = React.memo(({ icon, iconLib = 'community', label, value, iconBg, iconColor, isLast }: any) => (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
        <View style={[styles.infoIconBox, { backgroundColor: iconBg }]}>
            {iconLib === 'material' ? (
                <MaterialIcon name={icon} size={20} color={iconColor} />
            ) : (
                <MaterialCommunityIcon name={icon} size={20} color={iconColor} />
            )}
        </View>
        <View style={styles.infoText}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
));

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
    const { showModal } = useModal();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [donorStats, setDonorStats] = React.useState({ count: 0, livesSaved: 0, rank: 'Bronze' });
    const [actionLoading, setActionLoading] = React.useState(false);
    const [loadingUser, setLoadingUser] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('settings');

    React.useEffect(() => {
        if (!user) return;
        const unsubUser = subscribeToUser(user.uid, (data) => {
            if (data) {
                setUserData(data);
                setLoadingUser(false);
            } else {
                setLoadingUser(false);
            }
        });
        const unsubStats = getDonorStats(user.uid, setDonorStats);
        return () => {
            unsubUser();
            unsubStats();
        };
    }, [user]);

    const handleLogout = React.useCallback(() => {
        if (actionLoading) return;
        showModal({
            title: 'Logout',
            description: 'Are you sure you want to sign out?',
            type: 'danger',
            primaryText: 'Logout',
            onPrimaryPress: async () => {
                setActionLoading(true);
                await safeRun(
                    () => signOut(),
                    {
                        context: 'Settings > handleLogout',
                        errorTitle: 'Logout Failed',
                        allowRetry: false,
                        showModal,
                    }
                );
                setActionLoading(false);
            },
            secondaryText: 'Cancel',
        });
    }, [actionLoading, showModal]);

    const handleSwitchRole = React.useCallback(async () => {
        if (!user || !userData || actionLoading) return;
        const newRole = userData.lastActiveRole === 'donor' ? 'requester' : 'donor';
        const targetScreen = newRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard';

        setActionLoading(true);
        await safeRun(
            () => createUserDocument({ uid: user.uid, lastActiveRole: newRole }),
            {
                context: 'Settings > handleSwitchRole',
                errorTitle: 'Role Switch Failed',
                allowRetry: true,
                showModal,
                onSuccess: () => {
                    log('info', 'Settings > handleSwitchRole', `Switched to ${newRole}`);
                    navigation.replace(targetScreen, { tab: 'home' });
                },
            }
        );
        setActionLoading(false);
    }, [user, userData, actionLoading, showModal, navigation]);


    const tabs = React.useMemo(() => [
        {
            key: 'home',
            label: 'Home',
            icon: 'home',
            activeIcon: 'home',
            onPress: () => navigation.navigate(userData?.lastActiveRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard', { tab: 'home' })
        },
        {
            key: 'requests',
            label: 'Requests',
            icon: userData?.lastActiveRole === 'donor' ? 'water-drop' : 'list-alt',
            onPress: () => navigation.navigate(userData?.lastActiveRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard', { tab: 'requests' })
        },
        {
            key: 'history',
            label: 'History',
            icon: 'history',
            onPress: () => navigation.navigate(userData?.lastActiveRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard', { tab: 'history' })
        },
        {
            key: 'settings',
            label: 'Settings',
            icon: 'settings',
            activeIcon: 'settings',
            onPress: () => { }
        },
    ], [userData?.lastActiveRole, navigation]);

    if (loadingUser) {
        return <LoadingScreen tagline="Synchronizing your profile data..." />;
    }

    return (
        <View style={styles.container}>

            {/* ── White Header ── */}
            <View style={[styles.whiteHeader, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
                    <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitleText}>Profile Settings</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('EditProfile')}
                    style={styles.headerBackBtn}
                >
                    <MaterialIcon name="edit" size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                <View style={styles.profileHeaderCard}>
                    <View style={styles.profileIdentityRow}>
                        <View style={styles.avatarContainer}>
                            {userData?.photoURL ? (
                                <Image source={{ uri: userData.photoURL }} style={styles.mainAvatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <MaterialIcon name="person" size={40} color="white" />
                                </View>
                            )}
                            <View style={styles.verifiedBadge}>
                                <MaterialIcon name="verified" size={16} color="white" />
                            </View>
                        </View>
                        <View style={styles.identityTextContainer}>
                            <Text style={styles.userNameText}>{userData?.name || 'User Name'}</Text>
                            <Text style={styles.userEmailText}>{user?.email}</Text>
                            <View style={styles.bloodBadgeSmall}>
                                <MaterialCommunityIcon name="water" size={14} color="#B62022" />
                                <Text style={styles.bloodBadgeTextSmall}>{userData?.bloodGroup || '--'}</Text>
                            </View>
                        </View>
                    </View>
                </View>


                {/* ── Menu Sections ── */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuHeaderLabel}>PERSONAL INFORMATION</Text>
                    <View style={styles.menuSectionCard}>
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

                    <Text style={styles.menuHeaderLabel}>ACCOUNT SETTINGS</Text>
                    <View style={styles.menuSectionCard}>
                        <MenuOption
                            icon="swap-horizontal"
                            title={`Switch to ${userData?.lastActiveRole === 'donor' ? 'Requester' : 'Donor'} Mode`}
                            onPress={handleSwitchRole}
                            color="#8B5CF6"
                            isLast
                        />
                    </View>

                    <TouchableOpacity style={styles.logoutButtonModern} onPress={handleLogout}>
                        <MaterialCommunityIcon name="logout-variant" size={22} color="#EF4444" />
                        <Text style={styles.logoutButtonText}> Log Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerVersion}>BloodReach v1.0.0 • Build 24</Text>
                </View>
            </ScrollView>
            <BottomTabBar
                activeTab={activeTab}
                tabs={tabs}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    whiteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: 'white',
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleText: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

    profileHeaderCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    profileIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    mainAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#F8FAFC' },
    avatarPlaceholder: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#B62022',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#F8FAFC'
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3B82F6',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    identityTextContainer: {
        marginLeft: 18,
        flex: 1,
    },
    userNameText: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
    userEmailText: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
    bloodBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    bloodBadgeTextSmall: { color: '#B62022', fontWeight: '900', fontSize: 12, marginLeft: 4 },

    statsGrid: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 25,
        marginTop: -50,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
        alignItems: 'center',
    },
    statGridItem: { flex: 1, alignItems: 'center' },
    statGridVal: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
    statGridLab: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginTop: 5, textTransform: 'uppercase' },
    statGridDivider: { width: 1, height: 40, backgroundColor: '#F1F5F9' },
    rankBadgeSmall: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, borderRadius: 10 },

    menuContainer: { paddingHorizontal: 20, marginTop: 15 },
    menuHeaderLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        marginBottom: 10,
        marginLeft: 10,
        letterSpacing: 1.5,
    },
    menuSectionCard: {
        backgroundColor: 'white',
        borderRadius: 25,
        paddingHorizontal: 15,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTitle: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '700' },
    rightText: { fontSize: 12, fontWeight: '800', color: '#B62022', marginRight: 10, backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

    logoutButtonModern: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        paddingVertical: 18,
        borderRadius: 20,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '900', marginLeft: 10 },
    footerVersion: { textAlign: 'center', marginTop: 30, color: '#CBD5E1', fontSize: 12, fontWeight: '700' },

    // Info Row Styles
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

export default SettingsScreen;


