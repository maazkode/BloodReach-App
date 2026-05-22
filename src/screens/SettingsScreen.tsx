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
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../api/authService';
import { getUserDocument, getDonorStats, createUserDocument, subscribeToUser, updateUserPreferences } from '../api/firestoreService';
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
    const { user, userData } = useAuth();
    const currentRole = userData?.lastActiveRole;

    const [donorStats, setDonorStats] = React.useState({ count: 0, livesSaved: 0, rank: 'Bronze' });
    const [roleLoading, setRoleLoading] = React.useState(false);
    const [locationLoading, setLocationLoading] = React.useState(false);
    const [logoutLoading, setLogoutLoading] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('settings');

    React.useEffect(() => {
        if (!user) return;
        const unsubStats = getDonorStats(user.uid, setDonorStats);
        return () => unsubStats();
    }, [user]);

    const handleLogout = React.useCallback(() => {
        if (roleLoading || locationLoading || logoutLoading) return;
        showModal({
            title: 'Logout',
            description: 'Are you sure you want to sign out?',
            type: 'danger',
            primaryText: 'Logout',
            onPrimaryPress: async () => {
                setLogoutLoading(true);
                await safeRun(
                    () => signOut(),
                    {
                        context: 'Settings > handleLogout',
                        errorTitle: 'Logout Failed',
                        allowRetry: false,
                        showModal,
                    }
                );
                setLogoutLoading(false);
            },
            secondaryText: 'Cancel',
        });
    }, [roleLoading, locationLoading, logoutLoading, showModal]);

    const handleSwitchRole = React.useCallback(async () => {
        if (!user || !userData || !currentRole || roleLoading) return;
        const newRole = currentRole === 'donor' ? 'requester' : 'donor';
        const targetScreen = newRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard';

        setRoleLoading(true);

        await safeRun(
            () => createUserDocument({ uid: user.uid, lastActiveRole: newRole }),
            {
                context: 'Settings > handleSwitchRole',
                errorTitle: 'Role Switch Failed',
                allowRetry: true,
                showModal,
                onSuccess: () => {
                    log('info', 'Settings > handleSwitchRole', `Switched to ${newRole}`);
                    setTimeout(() => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: targetScreen as any, params: { tab: 'home' } }],
                        });
                    }, 100);
                },
                onError: () => {
                    // Role switch failed, state remains unchanged via global provider
                }
            }
        );
        setRoleLoading(false);
    }, [user, userData, currentRole, roleLoading, showModal, navigation]);

    const handleToggleLocationPreference = React.useCallback(async (value: boolean) => {
        if (!user || !userData || locationLoading) return;
        const nextPref = value ? 'auto' : 'off';

        setLocationLoading(true);
        await safeRun(
            () => updateUserPreferences(user.uid, { smartLocationPreference: nextPref }),
            {
                context: 'Settings > toggleLocationPreference',
                errorTitle: 'Failed to update setting',
                allowRetry: true,
                showModal,
            }
        );
        setLocationLoading(false);
    }, [user, userData, locationLoading, showModal]);


    const tabs = React.useMemo(() => [
        {
            key: 'home',
            label: 'Home',
            icon: 'home',
            activeIcon: 'home',
            onPress: () => {
                const routes = navigation.getState().routes;
                const dashboard = [...routes].reverse().find(r => r.name === 'DonorDashboard' || r.name === 'RequesterDashboard')?.name
                    || (currentRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard');
                navigation.navigate(dashboard as any, { tab: 'home' });
            }
        },
        {
            key: 'requests',
            label: 'Requests',
            icon: currentRole === 'donor' ? 'water-drop' : 'list-alt',
            onPress: () => {
                const routes = navigation.getState().routes;
                const dashboard = [...routes].reverse().find(r => r.name === 'DonorDashboard' || r.name === 'RequesterDashboard')?.name
                    || (currentRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard');
                navigation.navigate(dashboard as any, { tab: 'requests' });
            }
        },
        {
            key: 'history',
            label: 'History',
            icon: 'history',
            onPress: () => {
                const routes = navigation.getState().routes;
                const dashboard = [...routes].reverse().find(r => r.name === 'DonorDashboard' || r.name === 'RequesterDashboard')?.name
                    || (currentRole === 'donor' ? 'DonorDashboard' : 'RequesterDashboard');
                navigation.navigate(dashboard as any, { tab: 'history' });
            }
        },
        {
            key: 'settings',
            label: 'Settings',
            icon: 'settings',
            activeIcon: 'settings',
            onPress: () => { }
        },
    ], [currentRole, navigation]);

    if (!userData) {
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
                            rightText={roleLoading ? <ActivityIndicator size="small" color="#8B5CF6" /> : undefined}
                        />
                        <View style={styles.toggleItem}>
                            <View style={styles.toggleIconBox}>
                                <MaterialCommunityIcon name="crosshairs-gps" size={22} color="#0EA5E9" />
                            </View>
                            <Text style={styles.toggleTitle}>Smart Location Updates</Text>
                            {locationLoading ? (
                                <ActivityIndicator size="small" color="#0EA5E9" style={{ marginRight: 5 }} />
                            ) : (
                                <Switch
                                    trackColor={{ false: '#E2E8F0', true: '#BAE6FD' }}
                                    thumbColor={userData?.smartLocationPreference === 'off' ? '#F8FAFC' : '#0EA5E9'}
                                    ios_backgroundColor="#E2E8F0"
                                    onValueChange={handleToggleLocationPreference}
                                    value={userData?.smartLocationPreference !== 'off'}
                                />
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.logoutButtonModern, logoutLoading && { opacity: 0.7 }]}
                        onPress={handleLogout}
                        disabled={logoutLoading}
                    >
                        {logoutLoading ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <MaterialCommunityIcon name="logout-variant" size={22} color="#EF4444" />
                        )}
                        <Text style={styles.logoutButtonText}>
                            {logoutLoading ? 'Signing Out...' : 'Log Out'}
                        </Text>
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
        borderRadius: 10,
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
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    toggleIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0EA5E910',
    },
    toggleTitle: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '700', color: '#0EA5E9' },
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
