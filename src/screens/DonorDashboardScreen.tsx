import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Image,
    Dimensions,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingScreen from '../components/common/LoadingScreen';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { DonationRequest } from '../types/database';
import { signOut } from '../api/authService';
import BottomTabBar from '../components/common/BottomTabBar';
import { useModal } from '../context/ModalContext';

// Hooks
import { useDonorEligibility } from '../hooks/useDonorEligibility';
import { useDonorRequests } from '../hooks/useDonorRequests';
import { useDonorMatches } from '../hooks/useDonorMatches';
import { useDonorHistory } from '../hooks/useDonorHistory';
import { useSmartLocation } from '../hooks/useSmartLocation';

// Components
import { RestrictedHero, CooldownHero, ActiveHero } from '../components/donor/HeroSection';

const { width } = Dimensions.get('window');

const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.max(0, now.getTime() - date.getTime());
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
};

const getUrgencyText = (level: string) => {
    switch (level) {
        case 'critical': return 'Needed Immediately';
        case 'urgent': return 'Needed within 2 hours';
        default: return 'Needed within 24 hours';
    }
};

const PulseIndicator = React.memo(() => {
    const scale = React.useRef(new Animated.Value(1)).current;
    const opacity = React.useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.parallel([
                Animated.timing(scale, { toValue: 2.2, duration: 1500, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [scale, opacity]);

    return (
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale }], opacity }]} />
    );
});

const RequestItem = React.memo(({ item, isFullWidth, isEligible, onHelpPress, eligibilityDate }: {
    item: DonationRequest,
    isFullWidth?: boolean,
    isEligible: boolean,
    onHelpPress: (item: DonationRequest) => void,
    eligibilityDate?: string
}) => {
    const isUrgent = item.urgencyLevel === 'urgent' || item.urgencyLevel === 'critical';
    const urgencyColor = isUrgent ? '#E11D48' : '#D97706';
    const urgencyBg = isUrgent ? '#FFF1F2' : '#FEF3C7';
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[isFullWidth ? styles.newCardFull : styles.newCardHorizontal, isUrgent && styles.urgentCardBorder]}
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onHelpPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`Blood request for ${item.patientName}. Group ${item.bloodGroup}. Urgency: ${item.urgencyLevel}. Hospital: ${item.hospitalName}. Units needed: ${item.unitsRequired}.`}
            >
                {isUrgent && (
                    <View style={styles.emergencyIndicator}>
                        <PulseIndicator />
                        <View style={styles.emergencyDot} />
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <View style={styles.bloodGroupContainer}>
                        <Text style={styles.bloodGroupText}>{item.bloodGroup}</Text>
                        <Text style={styles.bloodGroupLabel}>Group</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[styles.urgencyBadge, { backgroundColor: urgencyBg }]}>
                            <MaterialCommunityIcon name={isUrgent ? "fire" : "clock-outline"} size={14} color={urgencyColor} />
                            <Text style={[styles.urgencyBadgeText, { color: urgencyColor }]}>{item.urgencyLevel.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.postedTime}>{getTimeAgo(item.createdAt)}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.patientName} numberOfLines={1}>For {item.patientName}</Text>
                    <View style={styles.infoRow}>
                        <MaterialIcon name="local-hospital" size={14} color="#64748B" />
                        <Text style={styles.infoText} numberOfLines={1}>{item.hospitalName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialIcon name="near-me" size={14} color="#64748B" />
                        <Text style={styles.infoText}>
                            {(item as any).distance !== undefined ? `${(item as any).distance} km` : '...'}
                        </Text>
                        <View style={styles.dotSeparator} />
                        <Text style={styles.urgencyDetail}>{getUrgencyText(item.urgencyLevel)}</Text>
                    </View>
                    <View style={styles.metricsRow}>
                        <View style={styles.metric}>
                            <MaterialCommunityIcon name="water" size={16} color="#E11D48" />
                            <Text style={styles.metricText}>{item.unitsRequired} Units</Text>
                        </View>
                        <View style={styles.metric}>
                            <MaterialCommunityIcon name="account-group" size={16} color="#64748B" />
                            <Text style={styles.metricText}>{item.matchedDonorIds?.length || 0} Responses</Text>
                        </View>
                    </View>

                    {/* Eligibility & Click Indicator */}
                    <View style={styles.compactFooter}>
                        <View style={styles.eligibilityRow}>
                            <View style={[styles.statusDot, { backgroundColor: isEligible ? '#22C55E' : '#F59E0B' }]} />
                            <Text style={[styles.statusText, { color: isEligible ? '#059669' : '#D97706' }]}>
                                {isEligible ? 'You are eligible' : (eligibilityDate ? `Eligible ${eligibilityDate}` : 'Not eligible')}
                            </Text>
                        </View>
                        <MaterialIcon name="chevron-right" size={20} color="#94A3B8" />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

const HistoryItem = React.memo(({ match, onPress }: { match: any, onPress: () => void }) => (
    <TouchableOpacity
        style={styles.newCardFull}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Completed donation for ${match.request?.patientName || 'Patient'} at ${match.request?.hospitalName || 'Hospital'}.`}
    >
        <View style={styles.cardHeader}>
            <View style={styles.bloodGroupContainer}>
                <Text style={styles.bloodGroupText}>{match.request?.bloodGroup || '--'}</Text>
                <Text style={styles.bloodGroupLabel}>Group</Text>
            </View>
            <View style={styles.headerRight}>
                <View style={[styles.urgencyBadge, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[styles.urgencyBadgeText, { color: '#64748B' }]}>{(match.status ?? 'pending').toUpperCase()}</Text>
                </View>
                <Text style={styles.postedTime}>
                    {(match.createdAt as any)?.toDate ? (match.createdAt as any).toDate().toLocaleDateString() : 'N/A'}
                </Text>
            </View>
        </View>
        <View style={styles.cardBody}>
            <Text style={styles.patientName} numberOfLines={1}>Donated for {match.request?.patientName || 'Patient'}</Text>
            <View style={styles.infoRow}>
                <MaterialIcon name="local-hospital" size={16} color="#64748B" />
                <Text style={styles.infoText} numberOfLines={1}>{match.request?.hospitalName || 'Hospital Info'}</Text>
            </View>
            <View style={styles.metricsRow}>
                <View style={styles.metric}>
                    <MaterialCommunityIcon name="water" size={18} color="#E11D48" />
                    <Text style={styles.metricText}>
                        {match.request?.unitsRequired || 1} Unit{(match.request?.unitsRequired || 1) > 1 ? 's' : ''}
                    </Text>
                </View>
            </View>
        </View>
    </TouchableOpacity>
));

type Props = NativeStackScreenProps<RootStackParamList, 'DonorDashboard'>;

const DonorDashboard: React.FC<Props> = ({ route, navigation }) => {
    const { showModal } = useModal();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState(route.params?.tab || 'home');

    // Custom Hooks
    const { userData, loadingUser, isAgeRestricted, isCooldownActive, formatCooldownDate } = useDonorEligibility();
    const { activeHelps, loadingMatches } = useDonorMatches();
    const { nearbyRequests, loadingRequests } = useDonorRequests(userData, loadingUser, activeHelps);
    const { donationHistory, loadingHistory } = useDonorHistory(activeTab);
    
    // Initialize Smart Location
    useSmartLocation();

    useEffect(() => {
        if (route.params?.tab) setActiveTab(route.params.tab);
    }, [route.params?.tab]);

    const handleHelpPress = useCallback((item: DonationRequest) => {
        if (!userData) return;
        if (isAgeRestricted) {
            showModal({
                title: 'Medical Restriction',
                description: userData.age && userData.age < 18 ? 'You must be at least 18 years old to donate blood.' : 'Donors over 60 years of age require special medical clearance.',
                type: 'error',
                primaryText: 'Understood'
            });
            return;
        }
        if (userData.isEligibleToDonate) {
            navigation.navigate('DonorHelpDetail', { requestId: item.id! });
        } else {
            showModal({
                title: 'Cooldown Active',
                description: `You recently donated blood. You will be eligible to help again on ${formatCooldownDate(userData?.donationCooldownUntil)}`,
                type: 'warning',
                primaryText: 'Got it'
            });
        }
    }, [userData, isAgeRestricted, navigation, showModal, formatCooldownDate]);

    const renderHero = () => {
        if (isAgeRestricted) return <RestrictedHero userData={userData} styles={styles} />;
        if (isCooldownActive) return <CooldownHero userData={userData} styles={styles} />;
        return <ActiveHero userData={userData} styles={styles} />;
    };

    const renderContent = () => {
        if (activeTab === 'requests') {
            return (
                <FlatList
                    data={nearbyRequests}
                    keyExtractor={(item) => item.id!}
                    renderItem={({ item }) => (
                        <RequestItem
                            item={item}
                            isFullWidth
                            isEligible={!!userData?.isEligibleToDonate}
                            onHelpPress={handleHelpPress}
                            eligibilityDate={userData?.donationCooldownUntil ? formatCooldownDate(userData.donationCooldownUntil) : undefined}
                        />
                    )}
                    ListHeaderComponent={<View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Matching Requests</Text></View>}
                    ListEmptyComponent={<View style={styles.emptyBox}><MaterialCommunityIcon name="water-off-outline" size={36} color="#CBD5E1" /><Text style={styles.emptyText}>No active matching requests nearby</Text></View>}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                />
            );
        }
        if (activeTab === 'history') {
            return (
                <FlatList
                    data={donationHistory}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <HistoryItem
                            match={item}
                            onPress={() => navigation.navigate('DonorHelpDetail', { requestId: item.requestId })}
                        />
                    )}
                    ListHeaderComponent={<View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Donation History</Text></View>}
                    ListEmptyComponent={<View style={styles.emptyBox}><MaterialCommunityIcon name="history" size={36} color="#CBD5E1" /><Text style={styles.emptyText}>You haven't completed any donations yet.</Text></View>}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                />
            );
        }

        // Home Tab
        return (
            <FlatList
                data={[]} // Using FlatList as a container for Home sections
                renderItem={null}
                ListHeaderComponent={
                    <>
                        {renderHero()}

                        {activeHelps.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <View style={styles.sectionHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.sectionTitle}>Active Helps</Text>
                                        <View style={styles.countBadge}><Text style={styles.countBadgeText}>{activeHelps.length}</Text></View>
                                    </View>
                                </View>
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    data={activeHelps.filter(m => !!m.request)}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <RequestItem
                                            item={item.request}
                                            isEligible={!!userData?.isEligibleToDonate}
                                            onHelpPress={() => navigation.navigate('DonorHelpDetail', { requestId: item.requestId })}
                                            eligibilityDate={userData?.donationCooldownUntil ? formatCooldownDate(userData.donationCooldownUntil) : undefined}
                                        />
                                    )}
                                    contentContainerStyle={styles.horizontalScrollContent}
                                />
                            </View>
                        )}

                        {(!isCooldownActive && !isAgeRestricted) && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Nearby Requests</Text>
                                    <TouchableOpacity onPress={() => setActiveTab('requests')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
                                </View>
                                {loadingRequests ? (
                                    <View style={styles.loadingBox}><ActivityIndicator size="small" color="#B62022" /><Text style={styles.loadingText}>Finding requests near you...</Text></View>
                                ) : nearbyRequests.length > 0 ? (
                                    <FlatList
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        data={nearbyRequests.slice(0, 5)}
                                        keyExtractor={(item) => item.id!}
                                        renderItem={({ item }) => (
                                            <RequestItem
                                                item={item}
                                                isEligible={!!userData?.isEligibleToDonate}
                                                onHelpPress={handleHelpPress}
                                                eligibilityDate={userData?.donationCooldownUntil ? formatCooldownDate(userData.donationCooldownUntil) : undefined}
                                            />
                                        )}
                                        contentContainerStyle={styles.horizontalScrollContent}
                                    />
                                ) : (
                                    <View style={styles.emptyBox}><MaterialCommunityIcon name="water-off-outline" size={36} color="#CBD5E1" /><Text style={styles.emptyText}>No active requests nearby</Text></View>
                                )}
                            </>
                        )}
                    </>
                }
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            />
        );
    };

    if (loadingUser) return <LoadingScreen tagline="Synchronizing your dashboard..." />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerBrand}>
                    <Image source={require('../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                    <Text style={styles.headerBrandName}>BloodReach</Text>
                </View>
            </View>
            {renderContent()}
            <BottomTabBar
                activeTab={activeTab}
                tabs={[
                    { key: 'home', label: 'Home', icon: 'home', activeIcon: 'home', onPress: () => setActiveTab('home') },
                    { key: 'requests', label: 'Requests', icon: 'water-drop', onPress: () => setActiveTab('requests') },
                    { key: 'history', label: 'History', icon: 'history', onPress: () => setActiveTab('history') },
                    { key: 'settings', label: 'Settings', icon: 'settings', activeIcon: 'settings', onPress: () => { navigation.navigate('Settings'); } },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
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
    newCardHorizontal: {
        width: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 10,
        marginRight: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    newCardFull: {
        marginHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    urgentCardBorder: {
        borderLeftWidth: 6,
        borderLeftColor: '#E11D48',
        backgroundColor: '#FFF5F5',
    },
    emergencyIndicator: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emergencyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E11D48',
    },
    pulseCircle: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E11D48',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    bloodGroupContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        minWidth: 50,
    },
    bloodGroupText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#E11D48',
        lineHeight: 24,
    },
    bloodGroupLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginTop: -2,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    urgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        marginBottom: 4,
    },
    urgencyBadgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    postedTime: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    cardBody: {
        marginBottom: 8,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        gap: 6,
    },
    infoText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
        flex: 1,
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#CBD5E1',
    },
    urgencyDetail: {
        fontSize: 12,
        color: '#E11D48',
        fontWeight: '700',
    },
    metricsRow: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 16,
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 4,
    },
    eligibilityContainer: {
        flex: 1,
    },
    eligibleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eligibleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },
    compactFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    eligibilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    ineligibleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ineligibleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D97706',
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
    unifiedTitleLarge: {
        fontSize: 20,
        fontWeight: '800',
        color: 'white',
        marginBottom: 8,
        textAlign: 'left',
    },
    unifiedSubtextLight: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
        marginBottom: 16,
        textAlign: 'left',
    },
    heroCard: {
        marginHorizontal: 16,
        backgroundColor: '#B62022',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        height: 200,
        justifyContent: 'center',
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
        backgroundColor: '#475569',
    },
    eligiblePillRestricted: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245,158,11,0.25)',
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
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    countBadge: {
        backgroundColor: '#E11D48',
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
        color: '#E11D48',
        fontWeight: '700',
    },
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    emptyBox: {
        marginHorizontal: 16,
        padding: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
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
        marginTop: 12,
        textAlign: 'center',
    },
});

export default DonorDashboard;



