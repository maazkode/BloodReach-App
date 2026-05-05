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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../../auth/services/authService';
import { getUserDocument, getDonorStats, createUserDocument } from '../services/firestoreService';
import { UserDocument } from '../types/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import LinearGradient from 'react-native-linear-gradient';
import { safeRun, log } from '../utils/errorHandler';
import { useModal } from '../context/ModalContext';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
    const { showModal } = useModal();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [donorStats, setDonorStats] = React.useState({ count: 0, livesSaved: 0, rank: 'Bronze' });
    const [actionLoading, setActionLoading] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            getUserDocument(user.uid).then(setUserData);
            const unsubStats = getDonorStats(user.uid, setDonorStats);
            return () => unsubStats();
        }
    }, [user]);

    const handleLogout = () => {
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
    };

    const handleSwitchRole = async () => {
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
                    navigation.replace(targetScreen);
                },
            }
        );
        setActionLoading(false);
    };

    const MenuOption = ({ icon, title, color = "#1E293B", onPress, isLast = false, rightText }: any) => (
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
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* ── Immersive Header ── */}
                <View style={styles.topProfileContainer}>
                    <LinearGradient
                        colors={['#B62022', '#801618']}
                        style={[styles.gradientHeader, { height: 280 + insets.top }]}
                    />

                    <View style={[styles.headerContent, { paddingTop: insets.top + 20 }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
                            <MaterialIcon name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitleText}>Profile Settings</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.profileMainBox}>
                        <View style={styles.avatarGlow}>
                            {userData?.photoURL ? (
                                <Image source={{ uri: userData.photoURL }} style={styles.mainAvatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <MaterialIcon name="person" size={50} color="white" />
                                </View>
                            )}
                        </View>
                        <Text style={styles.userNameText}>{userData?.name || 'User Name'}</Text>
                        <Text style={styles.userEmailText}>{user?.email}</Text>

                        <View style={styles.bloodTypeFloatingBadge}>
                            <MaterialCommunityIcon name="water" size={16} color="white" />
                            <Text style={styles.floatingBadgeText}>{userData?.bloodGroup || '--'}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Achievements / Stats Grid ── */}
                <View style={styles.statsGrid}>
                    <View style={styles.statGridItem}>
                        <Text style={styles.statGridVal}>{donorStats.count}</Text>
                        <Text style={styles.statGridLab}>Donations</Text>
                    </View>
                    <View style={styles.statGridDivider} />
                    <View style={styles.statGridItem}>
                        <Text style={styles.statGridVal}>{donorStats.livesSaved}</Text>
                        <Text style={styles.statGridLab}>Lives Saved</Text>
                    </View>
                    <View style={styles.statGridDivider} />
                    <View style={styles.statGridItem}>
                        <View style={styles.rankBadgeSmall}>
                            <Text style={styles.statGridVal}>{donorStats.rank}</Text>
                        </View>
                        <Text style={styles.statGridLab}>Member Rank</Text>
                    </View>
                </View>

                {/* ── Menu Sections ── */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuHeaderLabel}>ACCOUNT</Text>
                    <View style={styles.menuSectionCard}>
                        <MenuOption
                            icon="account-edit-outline"
                            title="Personal Information"
                            onPress={() => { }}
                            color="#3B82F6"
                        />
                        <MenuOption
                            icon="swap-horizontal"
                            title={`Switch to ${userData?.lastActiveRole === 'donor' ? 'Requester' : 'Donor'}`}
                            onPress={handleSwitchRole}
                            color="#8B5CF6"
                            rightText="Active"
                        />
                        <MenuOption
                            icon="history"
                            title="Donation History"
                            onPress={() => { }}
                            color="#10B981"
                            isLast
                        />
                    </View>

                    <Text style={styles.menuHeaderLabel}>PREFERENCES</Text>
                    <View style={styles.menuSectionCard}>
                        <MenuOption
                            icon="bell-outline"
                            title="Notifications"
                            onPress={() => { }}
                            color="#F59E0B"
                        />
                        <MenuOption
                            icon="shield-check-outline"
                            title="Privacy & Security"
                            onPress={() => { }}
                            color="#64748B"
                            isLast
                        />
                    </View>

                    <Text style={styles.menuHeaderLabel}>SUPPORT</Text>
                    <View style={styles.menuSectionCard}>
                        <MenuOption icon="help-circle-outline" title="Help & Feedback" onPress={() => { }} />
                        <MenuOption icon="information-outline" title="About BloodReach" onPress={() => { }} isLast />
                    </View>

                    <TouchableOpacity style={styles.logoutButtonModern} onPress={handleLogout}>
                        <MaterialCommunityIcon name="logout-variant" size={22} color="#EF4444" />
                        <Text style={styles.logoutButtonText}> Log Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerVersion}>BloodReach v1.0.0 • Build 24</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    topProfileContainer: { width: '100%', marginBottom: 30 },
    gradientHeader: {
        width: '100%',
        position: 'absolute',
        top: 0,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleText: { fontSize: 18, fontWeight: '800', color: 'white' },

    profileMainBox: {
        alignItems: 'center',
        marginTop: 30,
    },
    avatarGlow: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    mainAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'white' },
    avatarPlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#B62022',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: 'white'
    },
    userNameText: { fontSize: 24, fontWeight: '900', color: 'white', marginTop: 15 },
    userEmailText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 4 },

    bloodTypeFloatingBadge: {
        position: 'absolute',
        bottom: 50,
        right: width / 2 - 75,
        backgroundColor: '#1E293B',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    floatingBadgeText: { color: 'white', fontWeight: '900', fontSize: 14, marginLeft: 4 },

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

    menuContainer: { paddingHorizontal: 20, marginTop: 25 },
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
});

export default SettingsScreen;
