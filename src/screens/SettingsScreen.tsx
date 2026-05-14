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
import { UserDocument, UserRole } from '../types/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { safeRun, log } from '../utility/errorHandler';
import { useModal } from '../context/ModalContext';
import BottomTabBar from '../components/common/BottomTabBar';
import LoadingScreen from '../components/common/LoadingScreen';
import InfoRow from '../components/settings/InfoRow';
import MenuOption from '../components/settings/MenuOption';
import ProfileHeaderCard from '../components/settings/ProfileHeaderCard';


const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;


const SettingsScreen: React.FC<Props> = ({ navigation }) => {
    const { showModal } = useModal();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [currentRole, setCurrentRole] = React.useState<UserRole | null>(null);
    const [donorStats, setDonorStats] = React.useState({ count: 0, livesSaved: 0, rank: 'Bronze' });
    const [actionLoading, setActionLoading] = React.useState(false);
    const [loadingUser, setLoadingUser] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('settings');

    React.useEffect(() => {
        if (!user) return;
        const unsubUser = subscribeToUser(user.uid, (data) => {
            if (data) {
                setUserData(data);
                // Only sync from Firestore if not currently performing an action
                if (!actionLoading) {
                    setCurrentRole(data.lastActiveRole);
                }
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
        if (!user || !userData || !currentRole || actionLoading) return;
        const newRole = currentRole === 'donor' ? 'requester' : 'donor';
        const targetScreen = newRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard';

        setActionLoading(true);
        setCurrentRole(newRole); // Update locally instantly

        await safeRun(
            () => createUserDocument({ uid: user.uid, lastActiveRole: newRole }),
            {
                context: 'Settings > handleSwitchRole',
                errorTitle: 'Role Switch Failed',
                allowRetry: true,
                showModal,
                onSuccess: () => {
                    log('info', 'Settings > handleSwitchRole', `Switched to ${newRole}`);
                    // Ensure the navigation happens after the state is committed
                    setTimeout(() => {
                        navigation.replace(targetScreen, { tab: 'home' });
                    }, 100);
                },
                onError: () => {
                    // Revert if failed
                    setCurrentRole(currentRole);
                }
            }
        );
        setActionLoading(false);
    }, [user, userData, currentRole, actionLoading, showModal, navigation]);


    const tabs = React.useMemo(() => [
        {
            key: 'home',
            label: 'Home',
            icon: 'home',
            activeIcon: 'home',
            onPress: () => navigation.navigate(currentRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard', { tab: 'home' })
        },
        {
            key: 'requests',
            label: 'Requests',
            icon: currentRole === 'donor' ? 'water-drop' : 'list-alt',
            onPress: () => navigation.navigate(currentRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard', { tab: 'requests' })
        },
        {
            key: 'history',
            label: 'History',
            icon: 'history',
            onPress: () => navigation.navigate(currentRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard', { tab: 'history' })
        },
        {
            key: 'settings',
            label: 'Settings',
            icon: 'settings',
            activeIcon: 'settings',
            onPress: () => { }
        },
    ], [currentRole, navigation]);

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
                <ProfileHeaderCard userData={userData} userEmail={user?.email} />

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
                            title={`Switch to ${currentRole === 'donor' ? 'Requester' : 'Donor'} Mode`}
                            onPress={handleSwitchRole}
                            color="#8B5CF6"
                            isLast
                            rightText={actionLoading ? <ActivityIndicator size="small" color="#8B5CF6" /> : undefined}
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
    menuContainer: { paddingHorizontal: 20, marginTop: 10 },
    menuHeaderLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        marginTop: 5,
        marginBottom: 10,
        marginLeft: 10,
        letterSpacing: 1.5,
    },
    menuSectionCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    logoutButtonModern: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '900', marginLeft: 10 },
    footerVersion: { textAlign: 'center', marginTop: 30, color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
});

export default SettingsScreen;
