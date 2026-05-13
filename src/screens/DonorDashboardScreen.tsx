import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    FlatList,
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
import LoadingScreen from '../components/common/LoadingScreen';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import {
    getUserDocument,
    createUserDocument,
    subscribeToRequests,
    subscribeToNearbyRequests,
    subscribeToMatchingRequests,
    checkAndRefreshEligibility,
    getActiveDonorMatches,
    subscribeToUser,
    getDonorHistory,
    getCompatibleBloodGroups
} from '../api/firestoreService';
import { UserDocument, DonationRequest } from '../types/database';
import { signOut } from '../api/authService';
import { triggerLocalNotification } from '../api/notificationService';
import BottomTabBar from '../components/common/BottomTabBar';
import { useModal } from '../context/ModalContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DonorDashboard'>;
const { width } = Dimensions.get('window');

const getUrgencyColor = (level: string) => level === 'urgent' ? '#B62022' : '#D97706';
const getUrgencyBg = (level: string) => level === 'urgent' ? '#FEE2E2' : '#FEF3C7';
const getUrgencyLabel = (level: string) => level === 'urgent' ? 'EMERGENCY' : 'NEEDED';

const RequestItem = React.memo(({ item, isFullWidth, isEligible, onHelpPress }: {
    item: DonationRequest,
    isFullWidth?: boolean,
    isEligible: boolean,
    onHelpPress: (item: DonationRequest) => void
}) => {
    const urgencyColor = getUrgencyColor(item.urgencyLevel);
    const urgencyBg = getUrgencyBg(item.urgencyLevel);

    return (
        <TouchableOpacity
            style={isFullWidth ? styles.unifiedCardFull : styles.unifiedCardHorizontal}
            activeOpacity={0.82}
            onPress={() => onHelpPress(item)}
        >
            <View style={styles.unifiedCardTop}>
                <View style={styles.bloodBadge}>
                    <Text style={styles.bloodBadgeText}>{item.bloodGroup}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: urgencyBg }]}>
                    <Text style={[styles.statusPillText, { color: urgencyColor }]}>
                        {getUrgencyLabel(item.urgencyLevel)}
                    </Text>
                </View>
            </View>

            <Text style={styles.unifiedTitle} numberOfLines={1}>
                {item.hospitalName || 'Unknown Hospital'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.unifiedSubtext, { marginBottom: 0, flexShrink: 1, marginRight: 8 }]} numberOfLines={1}>
                    For {item.patientName || 'Patient'}
                </Text>
                <View style={styles.unitPill}>
                    <MaterialCommunityIcon name="water" size={12} color="#B62022" />
                    <Text style={styles.unitPillText}>
                        {item.unitsRequired} Unit{item.unitsRequired > 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            <View style={styles.unifiedMetaRow}>
                <View style={styles.metaItem}>
                    <MaterialIcon name="location-on" size={14} color="#94A3B8" />
                    <Text style={styles.metaText} numberOfLines={1}>
                        {item.city || 'Location'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const HistoryItem = React.memo(({ match, onPress }: { match: any, onPress: () => void }) => (
    <TouchableOpacity
        style={styles.unifiedCardFull}
        onPress={onPress}
    >
        <View style={styles.unifiedCardTop}>
            <View style={styles.bloodBadge}>
                <Text style={styles.bloodBadgeText}>{match.request?.bloodGroup || '--'}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.statusPillText, { color: '#64748B' }]}>
                    {(match.status ?? 'pending').toUpperCase()}
                </Text>
            </View>
        </View>
        <Text style={styles.unifiedTitle}>{match.request?.hospitalName || 'Hospital Info'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.unifiedSubtext, { marginBottom: 0, flexShrink: 1, marginRight: 8 }]} numberOfLines={1}>
                Donated for {match.request?.patientName || 'Patient'}
            </Text>
            <View style={styles.unitPill}>
                <MaterialCommunityIcon name="water" size={12} color="#B62022" />
                <Text style={styles.unitPillText}>
                    {match.request?.unitsRequired || 1} Unit{(match.request?.unitsRequired || 1) > 1 ? 's' : ''}
                </Text>
            </View>
        </View>
        <View style={styles.unifiedMetaRow}>
            <View style={styles.metaItem}>
                <MaterialIcon name="event" size={14} color="#94A3B8" />
                <Text style={styles.metaText}>
                    {(match.createdAt as any)?.toDate ? (match.createdAt as any).toDate().toLocaleDateString() : 'N/A'}
                </Text>
            </View>
        </View>
    </TouchableOpacity>
));

const DonorDashboard: React.FC<Props> = ({ route, navigation }) => {
    const { showModal } = useModal();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [userData, setUserData] = React.useState<UserDocument | null>(null);
    const [nearbyRequests, setNearbyRequests] = React.useState<DonationRequest[]>([]);
    const [activeHelps, setActiveHelps] = React.useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = React.useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState(route.params?.tab || 'home');

    // Sync activeTab when route.params.tab changes
    React.useEffect(() => {
        if (route.params?.tab) {
            setActiveTab(route.params.tab);
        }
    }, [route.params?.tab]);
    const [loadingUser, setLoadingUser] = React.useState(true);
    const [donationHistory, setDonationHistory] = React.useState<any[]>([]);

    // Effect for history
    React.useEffect(() => {
        if (!user || activeTab !== 'history') return;
        const unsubHistory = getDonorHistory(user.uid, (history) => {
            setDonationHistory(history);
        });
        return () => unsubHistory();
    }, [user, activeTab]);

    // Effect for active matches
    React.useEffect(() => {
        if (!user) return;
        const unsubMatches = getActiveDonorMatches(user.uid, (matches) => {
            setActiveHelps(matches);
        });
        return () => unsubMatches();
    }, [user]);

    React.useEffect(() => {
        if (!user) return;

        // Initial check and refresh (background)
        checkAndRefreshEligibility(user.uid);

        // Real-time listener for user document changes (including cooldown updates)
        const unsubUser = subscribeToUser(user.uid, (data) => {
            if (data) {
                console.log('[Dashboard] User data updated:', {
                    eligible: data.isEligibleToDonate,
                    available: data.isAvailable,
                    age: data.age
                });
                setUserData(data);
                setLoadingUser(false);
            } else {
                setLoadingUser(false);
            }
        });

        return () => unsubUser();
    }, [user]);

    React.useEffect(() => {
        let unsubscribe: () => void = () => { };

        if (!user) return;

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
                    const filtered = requests.filter(r => {
                        const isNotMe = r.requesterId !== user?.uid;
                        const isNotActive = !activeRequestIds.includes(r.id!);
                        let isCompatible = true;
                        if (userData?.bloodGroup) {
                            const compatible = getCompatibleBloodGroups(userData.bloodGroup);
                            isCompatible = compatible.includes(r.bloodGroup);
                        }
                        return isNotMe && isNotActive && isCompatible;
                    });
                    setNearbyRequests(filtered.slice(0, 10));
                    setLoadingRequests(false);
                }
            );
        } else {
            console.log('Subscribing to GLOBAL requests (no location)...');
            unsubscribe = subscribeToRequests((requests) => {
                const activeRequestIds = activeHelps.map(m => m.requestId);
                const filtered = requests.filter(r => {
                    const isNotMe = r.requesterId !== user?.uid;
                    const isNotActive = !activeRequestIds.includes(r.id!);
                    let isCompatible = true;
                    if (userData?.bloodGroup) {
                        const compatible = getCompatibleBloodGroups(userData.bloodGroup);
                        isCompatible = compatible.includes(r.bloodGroup);
                    }
                    return isNotMe && isNotActive && isCompatible;
                });
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

    React.useEffect(() => {
        if (!userData?.donationCooldownUntil || userData?.isEligibleToDonate || !user) return;

        const cooldownDate = (userData.donationCooldownUntil as any).toDate();
        const now = new Date();
        const timeUntilEligible = cooldownDate.getTime() - now.getTime();

        if (timeUntilEligible <= 0) {
            // Already eligible, but Firestore might not be updated yet
            checkAndRefreshEligibility(user.uid).then(updated => {
                if (updated) setUserData(updated);
            });
            return;
        }

        console.log(`Setting eligibility timer for ${timeUntilEligible}ms`);

        const timer = setTimeout(() => {
            checkAndRefreshEligibility(user.uid).then(updated => {
                if (updated) {
                    setUserData(updated);
                    showModal({
                        title: 'Welcome Back! 🩸',
                        description: 'Your recovery period is over. You are now eligible to donate and save lives again!',
                        type: 'success',
                        primaryText: 'Great'
                    });
                }
            });
        }, timeUntilEligible + 2000); // 2 second buffer

        return () => clearTimeout(timer);
    }, [userData?.donationCooldownUntil, userData?.isEligibleToDonate, user]);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const formatCooldownDate = React.useCallback((timestamp: any) => {
        if (!timestamp) return 'Available Now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }, []);

    const handleHelpPress = React.useCallback((item: DonationRequest) => {
        if (!userData) return;

        // 1. Check Age Restriction
        if (userData.age && (userData.age < 18 || userData.age > 60)) {
            showModal({
                title: 'Medical Restriction',
                description: userData.age < 18
                    ? 'You must be at least 18 years old to donate blood.'
                    : 'Donors over 60 years of age require special medical clearance and are currently restricted.',
                type: 'error',
                primaryText: 'Understood'
            });
            return;
        }

        // 2. Check Cooldown
        if (userData.isEligibleToDonate) {
            navigation.navigate('DonorHelpDetail', { requestId: item.id! });
        } else {
            showModal({
                title: 'Cooldown Active',
                description: 'You recently donated blood. You will be eligible to help again on ' + formatCooldownDate(userData?.donationCooldownUntil),
                type: 'warning',
                primaryText: 'Got it'
            });
        }
    }, [userData, navigation, showModal, formatCooldownDate]);

    const tabContent = React.useMemo(() => {
        switch (activeTab) {
            case 'requests':
                return (
                    <View style={{ paddingBottom: 20 }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Matching Requests</Text>
                        </View>
                        {nearbyRequests.length > 0 ? (
                            nearbyRequests.map(r => (
                                <RequestItem
                                    key={r.id}
                                    item={r}
                                    isFullWidth
                                    isEligible={!!userData?.isEligibleToDonate}
                                    onHelpPress={handleHelpPress}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyBox}>
                                <MaterialCommunityIcon name="water-off-outline" size={36} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No active matching requests nearby</Text>
                            </View>
                        )}
                    </View>
                );
            case 'history':
                return (
                    <View style={{ paddingBottom: 20 }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Donation History</Text>
                        </View>
                        {donationHistory.length > 0 ? (
                            donationHistory.map(match => (
                                <HistoryItem
                                    key={match.id}
                                    match={match}
                                    onPress={() => navigation.navigate('DonorHelpDetail', { requestId: match.requestId })}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyBox}>
                                <MaterialCommunityIcon name="history" size={36} color="#CBD5E1" />
                                <Text style={styles.emptyText}>You haven't completed any donations yet.</Text>
                            </View>
                        )}
                    </View>
                );
            default: { // home
                const isAgeRestricted = userData?.age && (userData.age < 18 || userData.age > 60);
                const isCooldownActive = userData?.isEligibleToDonate === false && !isAgeRestricted;

                return (
                    <>
                        {/* ── Eligibility Hero Card ── */}
                        {isAgeRestricted ? (
                            <View style={[styles.heroCard, styles.heroCardRestricted]}>
                                <View style={styles.unifiedCardTop}>
                                    <View style={styles.eligiblePillRestricted}>
                                        <MaterialIcon name="error-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                                        <Text style={styles.eligiblePillText}>RESTRICTED</Text>
                                    </View>
                                    <View style={styles.bloodBadge}>
                                        <Text style={styles.bloodBadgeText}>{userData?.bloodGroup || '--'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.unifiedTitleLarge}>Medical Restriction</Text>
                                <Text style={styles.unifiedSubtextLight}>
                                    {userData?.age! < 18
                                        ? "You're a bit too young to donate yet. You'll be ready once you're 18!"
                                        : "Donating after 60 requires specific medical conditions. Please consult a doctor."}
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.heroCard, isCooldownActive && styles.heroCardCooldown]}>
                                <View style={styles.unifiedCardTop}>
                                    <View style={[styles.eligiblePill, isCooldownActive && styles.cooldownPill]}>
                                        <View style={[styles.dot, isCooldownActive ? styles.redDot : styles.greenDot]} />
                                        <Text style={styles.eligiblePillText}>
                                            {isCooldownActive ? 'RECOVERY MODE' : (userData?.isAvailable ? 'ACTIVE' : 'OFFLINE')}
                                        </Text>
                                    </View>
                                    <View style={styles.bloodBadge}>
                                        <Text style={styles.bloodBadgeText}>{userData?.bloodGroup || 'A+'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.unifiedTitleLarge}>{isCooldownActive ? 'Take Rest & Recover' : 'Ready to Save Lives'}</Text>
                                <Text style={styles.unifiedSubtextLight}>
                                    {isCooldownActive
                                        ? `Eligible again after ${userData?.donationCooldownUntil ? (userData.donationCooldownUntil as any).toDate().toLocaleDateString() : 'cooldown'}`
                                        : 'Your donation can save up to 3 lives.'}
                                </Text>
                                {!isCooldownActive && (
                                    <TouchableOpacity style={styles.heroActionBtn} activeOpacity={0.8}>
                                        <MaterialIcon name="event-available" size={18} color="#B62022" />
                                        <Text style={styles.heroActionBtnText}>Schedule a Donation</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* ── Active Helps ── */}
                        {activeHelps.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <View style={styles.sectionHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.sectionTitle}>Active Helps</Text>
                                        <View style={styles.countBadge}><Text style={styles.countBadgeText}>{activeHelps.length}</Text></View>
                                    </View>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                                    {activeHelps.map((match) => {
                                        const isAccepted = match.status === 'accepted';
                                        return (
                                            <TouchableOpacity key={match.id} style={styles.unifiedCardHorizontal} activeOpacity={0.82} onPress={() => navigation.navigate('DonorHelpDetail', { requestId: match.requestId })}>
                                                <View style={styles.unifiedCardTop}>
                                                    <View style={styles.bloodBadge}><Text style={styles.bloodBadgeText}>{match.request?.bloodGroup || '--'}</Text></View>
                                                    <View style={[styles.statusPill, { backgroundColor: isAccepted ? '#DCFCE7' : '#F1F5F9' }]}>
                                                        <Text style={[styles.statusPillText, { color: isAccepted ? '#16A34A' : '#64748B' }]}>{(match.status ?? 'pending').toUpperCase()}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.unifiedTitle} numberOfLines={1}>{match.request?.hospitalName || 'Loading...'}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                                    <Text style={[styles.unifiedSubtext, { marginBottom: 0, flexShrink: 1, marginRight: 8 }]} numberOfLines={1}>For {match.request?.patientName || 'Patient'}</Text>
                                                    <View style={styles.unitPill}>
                                                        <MaterialCommunityIcon name="water" size={12} color="#B62022" /><Text style={styles.unitPillText}>{match.request?.unitsRequired ?? 0} Unit{(match.request?.unitsRequired ?? 0) !== 1 ? 's' : ''}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.unifiedMetaRow}>
                                                    <View style={styles.metaItem}><MaterialIcon name="location-on" size={14} color="#94A3B8" /><Text style={styles.metaText} numberOfLines={1}>{match.request?.city || 'Location'}</Text></View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* ── Nearby Requests ── */}
                        {(!isCooldownActive && !isAgeRestricted) && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Nearby Requests</Text>
                                    <TouchableOpacity onPress={() => setActiveTab('requests')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
                                </View>
                                {loadingRequests ? (
                                    <View style={styles.loadingBox}><ActivityIndicator size="small" color="#B62022" /><Text style={styles.loadingText}>Finding requests near you...</Text></View>
                                ) : nearbyRequests.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                                        {nearbyRequests.slice(0, 5).map((item: DonationRequest) => (
                                            <RequestItem key={item.id} item={item} isEligible={!!userData?.isEligibleToDonate} onHelpPress={handleHelpPress} />
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <View style={styles.emptyBox}><MaterialCommunityIcon name="water-off-outline" size={36} color="#CBD5E1" /><Text style={styles.emptyText}>No active requests nearby</Text></View>
                                )}
                            </>
                        )}
                    </>
                );
            }
        }
    }, [activeTab, nearbyRequests, donationHistory, userData, activeHelps, loadingRequests]);

    if (loadingUser) {
        return <LoadingScreen tagline="Synchronizing your dashboard..." />;
    }

    return (
        <View style={styles.container}>
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
                {tabContent}
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

    // ─── Unified Card System ───
    unifiedCardHorizontal: {
        width: 260,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    unifiedCardFull: {
        marginHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    unifiedCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    bloodBadge: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    bloodBadgeText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#B62022',
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    unifiedTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
        textAlign: 'left',
    },
    unifiedTitleSmall: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'left',
    },
    unifiedTitleLarge: {
        fontSize: 20,
        fontWeight: '800',
        color: 'white',
        marginBottom: 8,
        textAlign: 'left',
    },
    unifiedSubtext: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 12,
        textAlign: 'left',
    },
    unifiedSubtextLight: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
        marginBottom: 16,
        textAlign: 'left',
    },
    unifiedMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    unifiedMetaLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        marginBottom: 2,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginLeft: 4,
    },
    unitPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    unitPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#B62022',
        marginLeft: 4,
    },
    iconBoxSmall: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cooldownText: {
        color: '#D97706',
    },

    // ─── Hero eligibility specifics ───
    heroCard: {
        marginHorizontal: 16,
        backgroundColor: '#B62022',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        height: 200, // Fixed height for total consistency
        justifyContent: 'center', // Keep content balanced
    },
    heroCardCooldown: {
        backgroundColor: '#64748B',
    },
    heroActionBtn: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        height: 44,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    heroActionBtnText: {
        color: '#B62022',
        fontSize: 14,
        fontWeight: '700',
    },
    eligiblePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    heroCardRestricted: {
        backgroundColor: '#475569', // Distinct slate color for permanent/age restriction
    },
    eligiblePillRestricted: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245,158,11,0.25)', // Amber tint
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    cooldownPill: {
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    greenDot: { backgroundColor: '#22C55E' },
    redDot: { backgroundColor: '#FBBF24' },
    eligiblePillText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },

    // ─── General Components ───
    horizontalScrollContent: {
        paddingLeft: 16,
        paddingRight: 8,
        paddingBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    countBadge: {
        backgroundColor: '#B62022',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    countBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
    },
    seeAllText: {
        fontSize: 14,
        color: '#B62022',
        fontWeight: '700',
    },
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
    },

    // ─── Stats Refined ───
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1E293B',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 2,
    },

    // ─── Empty State ───
    emptyBox: {
        marginHorizontal: 16,
        height: 140,
        backgroundColor: 'white',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 10,
    },

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
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
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
        borderRadius: 10,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FEE2E2',
    },
    drawerAvatar: { width: '100%', height: '100%', borderRadius: 10 },
    drawerName: { fontSize: 17, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
    drawerEmail: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    drawerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bloodTypeBadge: {
        backgroundColor: '#B62022',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    bloodTypeBadgeText: { color: 'white', fontSize: 13, fontWeight: '800' },
    statusBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
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



