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

const { width } = Dimensions.get('window');

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

const REQUESTS_DATA = [
    {
        id: '1',
        type: 'O+',
        distance: '3 km',
        hospital: 'St. Mary\'s Hospital',
        reason: 'Required for emergency surgery',
        image: 'https://images.unsplash.com/photo-1587350859728-4476654a1809?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: '2',
        type: 'A-',
        distance: '5 km',
        hospital: 'City General Hospital',
        reason: 'Urgent plasma transfusion',
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop',
    }
];

const DonorDashboard: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Top Navbar */}
            <View style={[styles.navbar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity>
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
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestsList}>
                    {REQUESTS_DATA.map((item) => (
                        <View key={item.id} style={styles.requestCard}>
                            <View style={styles.requestImageContainer}>
                                <Image source={{ uri: item.image }} style={styles.requestImage} />
                                <View style={styles.emergencyBadge}>
                                    <MaterialIcon name="priority-high" size={12} color="white" />
                                    <Text style={styles.emergencyText}>EMERGENCY</Text>
                                </View>
                            </View>

                            <View style={styles.requestInfo}>
                                <View style={styles.typeRow}>
                                    <Text style={styles.bloodType}>{item.type}</Text>
                                    <View style={styles.distanceBadge}>
                                        <Text style={styles.distanceText}>{item.distance}</Text>
                                    </View>
                                </View>
                                <Text style={styles.hospitalName}>{item.hospital}</Text>
                                <Text style={styles.reasonText} numberOfLines={1}>{item.reason}</Text>

                                <TouchableOpacity style={styles.viewDetailsBtn}>
                                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>

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
                <TouchableOpacity style={styles.navItem}>
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
});

export default DonorDashboard;
