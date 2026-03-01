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

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerInfo}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/100?u=sarah' }}
                        style={styles.avatar}
                    />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.userName}>Hello, Sarah</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.notificationButton}>
                    <MaterialIcon name="notifications" size={26} color="#475569" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            >
                {/* Create Request Button */}
                <TouchableOpacity style={styles.createRequestButton}>
                    <View style={styles.plusCircle}>
                        <MaterialIcon name="add" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.createRequestText}>+ Create Blood Request</Text>
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
                    <View key={item.id} style={styles.requestCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.badgeRow}>
                                {item.status.map(renderStatusBadge)}
                            </View>
                            <Text style={styles.timeText}>{item.time}</Text>
                        </View>

                        <View style={styles.cardMain}>
                            <View style={styles.cardInfo}>
                                <Text style={styles.requestTitle}>{item.title}</Text>
                                <Text style={styles.requestSub}>
                                    {item.units} <Text style={styles.bullet}>•</Text> {item.hospital}
                                </Text>
                            </View>
                            <View style={[styles.bloodBadge, item.type === 'closed' && styles.bloodBadgeClosed]}>
                                <Text style={[styles.bloodBadgeText, item.type === 'closed' && styles.bloodBadgeTextClosed]}>
                                    {item.bloodType}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            {item.matches ? (
                                <View style={styles.matchesRow}>
                                    <View style={styles.matchCircle}><Text style={styles.matchText}>JD</Text></View>
                                    <View style={[styles.matchCircle, { backgroundColor: '#FEE2E2', marginLeft: -8 }]}><Text style={[styles.matchText, { color: '#DC2626' }]}>+1</Text></View>
                                </View>
                            ) : item.info ? (
                                <View style={styles.infoRow}>
                                    <View style={styles.greenDot} />
                                    <Text style={styles.infoText}>{item.info}</Text>
                                </View>
                            ) : <View />}

                            <TouchableOpacity style={[
                                styles.viewDetailsButton,
                                item.type === 'closed' && styles.viewDetailsButtonOutline
                            ]}>
                                <Text style={[
                                    styles.viewDetailsText,
                                    item.type === 'closed' && styles.viewDetailsTextOutline
                                ]}>View Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
                <TouchableOpacity style={styles.navItem}>
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
        borderRadius: 16,
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
        borderRadius: 16,
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
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: { fontSize: 11, fontWeight: '800' },
    timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
    cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardInfo: { flex: 1 },
    requestTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    requestSub: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    bullet: { marginHorizontal: 4, color: '#CBD5E1' },
    bloodBadge: {
        width: 60,
        height: 60,
        backgroundColor: '#FDECEC',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    bloodBadgeClosed: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
    bloodBadgeText: { fontSize: 20, fontWeight: '800', color: '#DC2626' },
    bloodBadgeTextClosed: { color: '#CBD5E1' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    matchesRow: { flexDirection: 'row', alignItems: 'center' },
    matchCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    matchText: { fontSize: 10, fontWeight: '800', color: '#1E293B' },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
    infoText: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
    viewDetailsButton: {
        backgroundColor: '#FDECEC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    viewDetailsButtonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    viewDetailsText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
    viewDetailsTextOutline: { color: '#64748B' },
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
});

export default RequesterDashboard;
