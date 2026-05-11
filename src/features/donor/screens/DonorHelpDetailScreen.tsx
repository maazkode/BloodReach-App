import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    StatusBar,
    Dimensions,
    Image
} from 'react-native';
import {
    useSafeAreaInsets
} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { safeRun, log, translateError } from '../../shared/utils/errorHandler';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { getAuth } from '@react-native-firebase/auth';
import {
    getDonationRequest,
    createDonationMatch,
    getMatchForDonor,
    completeDonation,
    getUserDocument,
    updateMatchStatus
} from '../../shared/services/firestoreService';
import { DonationRequest, DonationMatch, UserDocument } from '../../shared/types/database';
import { useModal } from '../../shared/context/ModalContext';
import LoadingScreen from '../../shared/components/LoadingScreen';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'DonorHelpDetail'>;

const DonorHelpDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { showModal } = useModal();
    const { requestId } = route.params;
    const [request, setRequest] = useState<DonationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [myMatch, setMyMatch] = useState<DonationMatch | null>(null);
    const [requester, setRequester] = useState<UserDocument | null>(null);

    const insets = useSafeAreaInsets();
    const currentUser = getAuth().currentUser;

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                log('info', 'DonorHelpDetail > fetchDetails', 'Loading request', { requestId });
                const reqData = await getDonationRequest(requestId);
                if (reqData) {
                    setRequest(reqData);
                    const userData = await getUserDocument(reqData.requesterId);
                    setRequester(userData);
                    const unsub = getMatchForDonor(requestId, currentUser?.uid || '', (match) => {
                        setMyMatch(match);
                    });
                    return () => unsub();
                } else {
                    showModal({
                        title: 'Request Not Found',
                        description: 'This blood request no longer exists or has been removed.',
                        type: 'error',
                        primaryText: 'Go Back',
                        onPrimaryPress: () => navigation.goBack()
                    });
                }
            } catch (error: any) {
                log('error', 'DonorHelpDetail > fetchDetails', 'Failed to load request', { code: error?.code });
                showModal({
                    title: 'Failed to Load',
                    description: translateError(error),
                    type: 'error',
                    primaryText: 'Go Back',
                    onPrimaryPress: () => navigation.goBack()
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [requestId]);

    if (loading) {
        return <LoadingScreen tagline="Fetching request details..." />;
    }

    if (!request) return null;

    const handleWhatsApp = (phone: string, name: string) => {
        const message = `Hi, I am reaching out regarding your urgent blood request for ${request.patientName} (${request.bloodGroup}) on BloodReach. I'm interested in helping.`;
        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() =>
            showModal({
                title: 'Cannot Open WhatsApp',
                description: 'WhatsApp is not installed on this device.',
                type: 'error',
                primaryText: 'OK'
            })
        );
    };

    const handleInterest = async () => {
        if (!currentUser || !request) {
            log('warn', 'DonorHelpDetail > handleInterest', 'Missing user or request data');
            return;
        }

        setActionLoading(true);
        await safeRun(
            () => createDonationMatch(requestId, currentUser.uid, request.requesterId),
            {
                context: 'DonorHelpDetail > handleInterest',
                errorTitle: 'Could Not Send Request',
                showModal,
                onSuccess: () =>
                    showModal({
                        title: 'Request Sent ✓',
                        description: 'The requester has been notified. You will see their contact details once they accept.',
                        type: 'success',
                        primaryText: 'OK'
                    }),
            }
        );
        setActionLoading(false);
    };

    const handleComplete = async () => {
        if (!currentUser) return;
        showModal({
            title: 'Confirm Donation',
            description: 'Have you successfully donated blood? This will start your 90-day recovery period.',
            type: 'info',
            primaryText: 'Yes, I Donated',
            onPrimaryPress: async () => {
                setActionLoading(true);
                await safeRun(
                    () => completeDonation(requestId, currentUser.uid),
                    {
                        context: 'DonorHelpDetail > handleComplete',
                        errorTitle: 'Could Not Mark Donation',
                        allowRetry: true,
                        showModal,
                        onSuccess: () => {
                            showModal({
                                title: 'Thank You! 🩸',
                                description: 'You saved a life! You are now in your 90-day recovery window.',
                                type: 'success',
                                primaryText: 'Finish',
                                onPrimaryPress: () => navigation.replace('DonorDashboard', { tab: 'home' })
                            });
                        },
                    }
                );
                setActionLoading(false);
            },
            secondaryText: 'Cancel'
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <View style={[styles.whiteHeader, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtnHeader}
                >
                    <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.whiteHeaderTitle}>Request Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >


                <View style={styles.patientHeroCard}>
                    <View style={styles.patientHeroIdentity}>
                        <View style={styles.patientNameContainer}>
                            <Text style={styles.patientLabel}>PATIENT NAME</Text>
                            <Text style={styles.patientNameHero} numberOfLines={2}>{request.patientName}</Text>
                            <View style={styles.urgencyBadgeHero}>
                                <MaterialCommunityIcon
                                    name={request.urgencyLevel === 'urgent' ? 'lightning-bolt' : 'clock-outline'}
                                    size={14}
                                    color={request.urgencyLevel === 'urgent' ? '#B62022' : '#64748B'}
                                />
                                <Text style={[styles.urgencyTextHero, request.urgencyLevel === 'urgent' && { color: '#B62022' }]}>
                                    {request.urgencyLevel === 'urgent' ? 'CRITICAL PRIORITY' : 'NORMAL PRIORITY'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.patientHeroBloodBadge}>
                            <View style={styles.bloodBadgeInner}>
                                <MaterialCommunityIcon name="water" size={24} color="#B62022" />
                                <Text style={styles.bloodBadgeValueHero}>{request.bloodGroup}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.patientHeroDivider} />

                    <View style={styles.patientHeroStatsGrid}>
                        <View style={styles.patientHeroStat}>
                            <Text style={styles.patientHeroStatValue}>{request.unitsRequired}</Text>
                            <Text style={styles.patientHeroStatLabel}>UNITS NEEDED</Text>
                        </View>
                        <View style={styles.patientHeroStatDivider} />
                        <View style={styles.patientHeroStat}>
                            <Text style={styles.patientHeroStatValue}>Pending</Text>
                            <Text style={styles.patientHeroStatLabel}>STATUS</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.scrollContent}>
                    {request.urgencyLevel === 'urgent' && (
                        <View style={styles.emergencyAlertCard}>
                            <MaterialIcon name="report-problem" size={24} color="#B62022" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.emergencyAlertTitle}>High Priority Request</Text>
                                <Text style={styles.emergencyAlertSub}>This patient requires immediate assistance.</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitleSmall}>Hospital Information</Text>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIconBox}>
                                    <MaterialIcon name="local-hospital" size={20} color="#B62022" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.infoMainText}>{request.hospitalName}</Text>
                                    <Text style={styles.infoSubText}>{request.hospitalAddress}, {request.city}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.mapActionBtn}
                                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.hospitalName + " " + request.city)}`)}
                            >
                                <MaterialIcon name="directions" size={20} color="#B62022" />
                                <Text style={styles.mapActionText}>Get Directions</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitleSmall}>Requested By</Text>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <View style={styles.avatarBox}>
                                    {requester?.photoURL ? (
                                        <Image source={{ uri: requester.photoURL }} style={styles.avatarImage} />
                                    ) : (
                                        <MaterialIcon name="person" size={24} color="#94A3B8" />
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.infoMainText}>{requester?.name || 'BloodReach User'}</Text>
                                        <MaterialIcon name="verified" size={14} color="#16A34A" style={{ marginLeft: 4 }} />
                                    </View>
                                    <Text style={styles.infoSubText}>{myMatch?.status === 'accepted' ? 'ACCEPTED' : 'Verified Requester'}</Text>
                                </View>
                                {myMatch?.status === 'accepted' && (
                                    <MaterialIcon name="check-circle" size={22} color="#22C55E" />
                                )}
                            </View>

                            {myMatch?.status === 'accepted' && (
                                <>
                                    <View style={styles.contactRow}>
                                        <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${request.phone}`)}>
                                            <MaterialIcon name="phone" size={20} color="#B62022" />
                                            <Text style={styles.contactBtnText}>Call</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleWhatsApp(request.phone, 'Requester')}>
                                            <MaterialCommunityIcon name="whatsapp" size={20} color="#22C55E" />
                                            <Text style={[styles.contactBtnText, { color: '#22C55E' }]}>WhatsApp</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.cancelActionBtn, { marginTop: 12 }]}
                                        onPress={() => updateMatchStatus(myMatch.id!, 'cancelled', myMatch)}
                                    >
                                        <MaterialCommunityIcon name="close-circle-outline" size={20} color="#94A3B8" />
                                        <Text style={styles.cancelActionText}>Cancel Helping</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.actionSection}>
                        {myMatch === null ? (
                            request.requesterId === currentUser?.uid ? (
                                <View style={styles.selfRequestBox}>
                                    <MaterialIcon name="info" size={20} color="#64748B" />
                                    <Text style={styles.selfRequestText}>This is your own request.</Text>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.primaryActionBtn} onPress={handleInterest} disabled={actionLoading}>
                                    {actionLoading ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <MaterialIcon name="favorite" size={22} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.primaryActionText}>I Want to Donate</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )
                        ) : myMatch.status === 'pending' ? (
                            <View style={styles.pendingStatusBox}>
                                <ActivityIndicator size="small" color="#B62022" />
                                <Text style={styles.pendingStatusText}>Request Sent. Waiting for approval...</Text>
                            </View>
                        ) : myMatch.status === 'accepted' ? null : myMatch.status === 'in_progress' ? (
                            <View style={styles.activeMatchCard}>
                                <View style={[styles.matchStatusBanner, { backgroundColor: '#1E293B' }]}>
                                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.matchStatusText}>Donation in Progress</Text>
                                </View>

                                <View style={styles.matchContent}>
                                    <TouchableOpacity style={styles.completeActionBtn} onPress={handleComplete} disabled={actionLoading}>
                                        <MaterialIcon name="check-circle" size={22} color="#fff" />
                                        <Text style={styles.completeActionText}>Mark as Completed</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.failedActionBtn}
                                        onPress={() => updateMatchStatus(myMatch.id!, 'failed', myMatch)}
                                        disabled={actionLoading}
                                    >
                                        <MaterialIcon name="error-outline" size={20} color="#64748B" />
                                        <Text style={styles.failedActionText}>Donation Failed</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : myMatch.status === 'completed' ? (
                            <View style={styles.successBox}>
                                <MaterialIcon name="stars" size={32} color="#16A34A" />
                                <Text style={styles.successTitle}>Heroic Act!</Text>
                                <Text style={styles.successSub}>Thank you for saving a life today.</Text>
                            </View>
                        ) : (
                            <View style={styles.infoBox}>
                                <MaterialIcon name="info" size={22} color="#64748B" />
                                <Text style={styles.infoBoxText}>This donation attempt ended ({myMatch.status}).</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    whiteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: 'white',
    },
    backBtnHeader: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    whiteHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

    heroBackground: {
        height: 120,
        width: '100%',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    patientHeroCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    patientHeroIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    patientNameContainer: {
        flex: 1,
        paddingRight: 15,
    },
    patientLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 6,
    },
    patientNameHero: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: 8,
    },
    urgencyBadgeHero: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    urgencyTextHero: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748B',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    patientHeroBloodBadge: {
        width: 60,
        height: 60,
    },
    bloodBadgeInner: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    bloodBadgeValueHero: {
        fontSize: 18,
        fontWeight: '900',
        color: '#B62022',
        marginTop: -2,
    },
    patientHeroDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    patientHeroStatsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    patientHeroStat: {
        flex: 1,
        alignItems: 'center',
    },
    patientHeroStatValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    patientHeroStatLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    patientHeroStatDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#F1F5F9',
    },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 0 },

    emergencyAlertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    emergencyAlertTitle: { fontSize: 15, fontWeight: '800', color: '#B62022' },
    emergencyAlertSub: { fontSize: 12, color: '#991B1B', marginTop: 2, fontWeight: '500' },

    infoSection: { marginBottom: 20 },
    sectionTitleSmall: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10, marginLeft: 4, letterSpacing: 1 },
    infoCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FDECEC', justifyContent: 'center', alignItems: 'center' },
    infoMainText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    infoSubText: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },

    mapActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 8,
    },
    mapActionText: { color: '#B62022', fontSize: 14, fontWeight: '700' },

    avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: 44, height: 44, borderRadius: 22 },

    actionSection: { marginTop: 0, marginBottom: 20 },
    primaryActionBtn: {
        backgroundColor: '#B62022',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#B62022',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    primaryActionText: { color: 'white', fontSize: 16, fontWeight: '800' },

    pendingStatusBox: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    pendingStatusText: { color: '#64748B', fontSize: 15, fontWeight: '600' },

    activeMatchCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    matchStatusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    matchStatusText: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    matchContent: { padding: 20 },
    matchInstruction: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20, fontWeight: '500' },

    contactCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    donorInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    donorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    donorName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    donorStatus: { fontSize: 11, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.5 },

    contactRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    contactBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FEF2F2', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
    contactBtnText: { color: '#B62022', fontSize: 15, fontWeight: '800' },

    cancelActionBtn: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        gap: 8,
    },
    cancelActionText: { color: '#64748B', fontSize: 15, fontWeight: '700' },

    completeActionBtn: {
        backgroundColor: '#16A34A',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    completeActionText: { color: 'white', fontSize: 16, fontWeight: '800' },

    failedActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        height: 50,
        gap: 8,
    },
    failedActionText: { color: '#64748B', fontSize: 14, fontWeight: '700' },

    successBox: {
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        borderRadius: 24,
        padding: 30,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    successTitle: { fontSize: 22, fontWeight: '900', color: '#166534', marginTop: 12 },
    successSub: { fontSize: 14, color: '#15803D', marginTop: 4, fontWeight: '600' },

    infoBox: {
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoBoxText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
    selfRequestBox: {
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    selfRequestText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});

export default DonorHelpDetailScreen;
