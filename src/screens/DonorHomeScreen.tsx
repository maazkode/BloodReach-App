import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Dimensions,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const IMPACT_DATA = [
    { id: 1, title: 'Lives Saved', value: '36', icon: 'favorite', color: '#EF4444' },
    { id: 2, title: 'Donations', value: '12', icon: 'water-drop', color: '#3B82F6' },
    { id: 3, title: 'Points', value: '2.4k', icon: 'stars', color: '#F59E0B' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'DonorHome'>;

const DonorHomeScreen: React.FC<Props> = ({ navigation }) => {
    const [isAvailable, setIsAvailable] = useState(true);
    const insets = useSafeAreaInsets();

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
            >
                {/* Header Section */}
                <View style={styles.headerWrapper}>
                    <LinearGradient
                        colors={[Colors.primary, '#9F1D1E']}
                        style={[styles.headerGradient, { paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 25) }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.topBar}>
                            <View>
                                <Text style={styles.greetingText}>{getTimeGreeting()},</Text>
                                <Text style={styles.userNameText}>Maaz Khan 👋</Text>
                            </View>
                            <TouchableOpacity style={styles.profileContainer}>
                                <Image
                                    source={{ uri: 'https://i.pravatar.cc/150?u=maaz' }}
                                    style={styles.profileImage}
                                />
                                <View style={styles.onlineBadge} />
                            </TouchableOpacity>
                        </View>

                        {/* Eligibility Card */}
                        <View style={styles.eligibilityCard}>
                            <View style={styles.eligibilityInfo}>
                                <Text style={styles.eligibilityLabel}>Next Eligibility</Text>
                                <Text style={styles.eligibilityDate}>22 May, 2026</Text>
                                <View style={styles.statusBadge}>
                                    <MaterialIcon name="verified" size={12} color="white" />
                                    <Text style={styles.statusBadgeText}>Eligible to Donate</Text>
                                </View>
                            </View>
                            <View style={styles.bloodTypeCard}>
                                <MaterialIcon name="water-drop" size={40} color="rgba(255,255,255,0.2)" style={styles.waterDropBg} />
                                <Text style={styles.bloodTypeTextLarge}>A+</Text>
                            </View>
                        </View>

                        {/* Buffer space for overlapping child */}
                        <View style={{ height: 45 }} />
                    </LinearGradient>
                </View>

                <View style={styles.mainContent}>
                    {/* Impact Row */}
                    <View style={styles.impactRow}>
                        {IMPACT_DATA.map((item) => (
                            <View key={item.id} style={styles.impactCard}>
                                <View style={[styles.impactIconBox, { backgroundColor: `${item.color}15` }]}>
                                    <MaterialIcon name={item.icon} size={20} color={item.color} />
                                </View>
                                <Text style={styles.impactTitle}>{item.title}</Text>
                                <Text style={styles.impactValue}>{item.value}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Availability Section */}
                    <View style={styles.availabilityWrapper}>
                        <View style={styles.availabilityInfo}>
                            <Text style={styles.availabilityTitle}>Availability Status</Text>
                            <Text style={styles.availabilitySubtitle}>You are visible to nearby seekers</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setIsAvailable(!isAvailable)}
                            style={[
                                styles.switchTrack,
                                { backgroundColor: isAvailable ? Colors.primary : '#CBD5E1' }
                            ]}
                        >
                            <View style={[
                                styles.switchThumb,
                                { alignSelf: isAvailable ? 'flex-end' : 'flex-start' }
                            ]} />
                        </TouchableOpacity>
                    </View>

                    {/* Action Grid */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeading}>Main Actions</Text>
                    </View>
                    <View style={styles.actionGrid}>
                        {[
                            { icon: 'search', label: 'Search', color: Colors.primary, bg: '#FDECEC' },
                            { icon: 'history', label: 'History', color: '#3B82F6', bg: '#EFF6FF' },
                            { icon: 'map', label: 'Centers', color: '#10B981', bg: '#F0FDF4' },
                            { icon: 'emoji-events', label: 'Rewards', color: '#F59E0B', bg: '#FFFBEB' },
                        ].map((action, idx) => (
                            <TouchableOpacity key={idx} style={styles.actionItem}>
                                <View style={[styles.actionIconWrapper, { backgroundColor: action.bg }]}>
                                    <MaterialIcon name={action.icon} size={26} color={action.color} />
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Urgent Requests */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeading}>Urgent Blood Requests</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewAllBtn}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {['B+', 'O-'].map((blood, idx) => (
                        <TouchableOpacity key={idx} style={styles.requestItem}>
                            <View style={styles.bloodBadge}>
                                <Text style={styles.bloodBadgeText}>{blood}</Text>
                            </View>
                            <View style={styles.requestContent}>
                                <Text style={styles.hospitalText}>City General Hospital</Text>
                                <View style={styles.metaRow}>
                                    <MaterialIcon name="location-pin" size={14} color="#64748B" />
                                    <Text style={styles.distanceText}>1.5 km</Text>
                                    <View style={styles.urgentTag}>
                                        <Text style={styles.urgentTagText}>URGENT</Text>
                                    </View>
                                </View>
                            </View>
                            <MaterialIcon name="chevron-right" size={24} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Bottom Tab Bar */}
            <View style={[styles.bottomTabBar, { bottom: insets.bottom + 15 }]}>
                <TouchableOpacity style={styles.tabItem}>
                    <MaterialIcon name="grid-view" size={26} color={Colors.primary} />
                    <Text style={[styles.tabText, { color: Colors.primary }]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <MaterialIcon name="search" size={26} color="#94A3B8" />
                    <Text style={styles.tabText}>Explore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <MaterialIcon name="history" size={26} color="#94A3B8" />
                    <Text style={styles.tabText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <MaterialIcon name="person" size={26} color="#94A3B8" />
                    <Text style={styles.tabText}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerWrapper: {
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    headerGradient: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    userNameText: {
        fontSize: 22,
        fontWeight: '800',
        color: 'white',
        marginTop: 4,
    },
    profileContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 52,
        height: 52,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: 'white',
    },
    eligibilityCard: {
        marginTop: 25,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    eligibilityInfo: {
        flex: 1,
    },
    eligibilityLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    eligibilityDate: {
        fontSize: 24,
        fontWeight: '900',
        color: 'white',
        marginVertical: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginTop: 2,
    },
    statusBadgeText: {
        fontSize: 10,
        color: 'white',
        fontWeight: '800',
        marginLeft: 4,
    },
    bloodTypeCard: {
        width: 70,
        height: 70,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    waterDropBg: {
        position: 'absolute',
        bottom: -5,
        right: -5,
    },
    bloodTypeTextLarge: {
        fontSize: 26,
        fontWeight: '900',
        color: 'white',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    mainContent: {
        paddingHorizontal: 20,
    },
    impactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -38,
        paddingHorizontal: 4,
        zIndex: 10,
    },
    impactCard: {
        backgroundColor: 'white',
        width: (width - 64) / 3,
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    impactIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    impactTitle: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '700',
    },
    impactValue: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1E293B',
        marginTop: 2,
    },
    availabilityWrapper: {
        backgroundColor: 'white',
        borderRadius: 22,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 25,
        elevation: 3,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    availabilityInfo: {
        flex: 1,
    },
    availabilityTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    availabilitySubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    switchTrack: {
        width: 52,
        height: 28,
        borderRadius: 14,
        padding: 4,
    },
    switchThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 28,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    viewAllBtn: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '700',
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    actionItem: {
        alignItems: 'center',
        width: (width - 64) / 4,
    },
    actionIconWrapper: {
        width: 58,
        height: 58,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    requestItem: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
    },
    bloodBadge: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    bloodBadgeText: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.primary,
    },
    requestContent: {
        flex: 1,
    },
    hospitalText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceText: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 4,
    },
    urgentTag: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        marginLeft: 12,
    },
    urgentTagText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#B91C1C',
    },
    bottomTabBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: 75,
        backgroundColor: 'white',
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 5,
    },
});

export default DonorHomeScreen;
