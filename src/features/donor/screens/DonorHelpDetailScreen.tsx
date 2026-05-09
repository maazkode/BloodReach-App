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
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#B62022" />
            </View>
        );
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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#B62022', '#801618']}
                style={styles.headerWrapper}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcon name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Patient Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.heroSection}>
                    <View style={styles.heroBloodBadge}>
                        <MaterialCommunityIcon name="water" size={20} color="white" />
                        <Text style={styles.heroBloodText}>{request.bloodGroup}</Text>
                    </View>
                    <Text style={styles.heroPatientName} numberOfLines={2}>{request.patientName}</Text>
                    <View style={styles.heroStatsRow}>
                        <View style={styles.heroStatItem}>
                            <MaterialCommunityIcon name="opacity" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.heroStatText}>{request.unitsRequired} Units</Text>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStatItem}>
                            <MaterialCommunityIcon name="clock-outline" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.heroStatText}>{request.urgencyLevel === 'urgent' ? 'Urgent' : 'Normal'}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[]}
            >
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
                                <Text style={styles.infoSubText}>Verified Requester</Text>
                            </View>
                        </View>
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
                    ) : myMatch.status === 'accepted' ? (
                        <View style={styles.activeMatchCard}>
                            <LinearGradient
                                colors={['#16A34A', '#15803D']}
                                style={styles.matchStatusBanner}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <MaterialIcon name="check-circle" size={18} color="white" />
                                <Text style={styles.matchStatusText}>Match Accepted!</Text>
                            </LinearGradient>

                            <View style={styles.matchContent}>
                                <Text style={styles.matchInstruction}>You can now contact the requester to coordinate.</Text>

                                <View style={styles.contactButtonsRow}>
                                    <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(`tel:${request.phone}`)}>
                                        <View style={[styles.contactIconBox, { backgroundColor: '#FDECEC' }]}>
                                            <MaterialIcon name="phone" size={20} color="#B62022" />
                                        </View>
                                        <Text style={styles.contactLabel}>Call</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.contactButton} onPress={() => handleWhatsApp(request.phone, 'Requester')}>
                                        <View style={[styles.contactIconBox, { backgroundColor: '#E7F9ED' }]}>
                                            <MaterialCommunityIcon name="whatsapp" size={20} color="#16A34A" />
                                        </View>
                                        <Text style={styles.contactLabel}>WhatsApp</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.startProcessBtn}
                                    onPress={() => updateMatchStatus(myMatch.id!, 'in_progress', myMatch)}
                                    disabled={actionLoading}
                                >
                                    <MaterialIcon name="play-arrow" size={22} color="#fff" />
                                    <Text style={styles.startProcessText}>Start Donation Process</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.textLinkBtn}
                                    onPress={() => updateMatchStatus(myMatch.id!, 'cancelled', myMatch)}
                                >
                                    <Text style={styles.textLink}>Cancel Helping</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : myMatch.status === 'in_progress' ? (
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
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

    headerWrapper: {
        width: '100%',
        paddingTop: 50,
        paddingBottom: 30,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },

    heroSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 15,
    },
    heroBloodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        gap: 6,
    },
    heroBloodText: { fontSize: 20, fontWeight: '900', color: 'white' },
    heroPatientName: { fontSize: 28, fontWeight: '900', color: 'white', marginTop: 12, textAlign: 'center' },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroStatText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
    heroStatDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 15 },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    emergencyAlertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 16,
        marginTop: 10,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    emergencyAlertTitle: { fontSize: 15, fontWeight: '800', color: '#B62022' },
    emergencyAlertSub: { fontSize: 12, color: '#991B1B', marginTop: 2, fontWeight: '500' },

    infoSection: { marginBottom: 24, marginTop: 24 },
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

    actionSection: { marginTop: 10 },
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

    contactButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    contactButton: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    contactIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    contactLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B' },

    startProcessBtn: {
        backgroundColor: '#1E293B',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    startProcessText: { color: 'white', fontSize: 16, fontWeight: '800' },

    textLinkBtn: { marginTop: 16, alignSelf: 'center' },
    textLink: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },

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
