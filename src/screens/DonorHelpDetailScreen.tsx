import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getAuth } from '@react-native-firebase/auth';
import {
    getDonationRequest,
    createDonationMatch,
    getMatchForDonor,
    completeDonation,
    getUserDocument,
    updateMatchStatus,
    getDistance
} from '../api/firestoreService';
import { useAuth } from '../context/AuthContext';
import { DonationRequest, DonationMatch, UserDocument } from '../types/database';
import { useModal } from '../context/ModalContext';
import { safeRun, log, translateError } from '../utility/errorHandler';
import { isUserAvailableNow } from '../utility/availability';
import LoadingScreen from '../components/common/LoadingScreen';
import ScreenHeader from '../components/common/ScreenHeader';
import DetailInfoCard from '../components/details/DetailInfoCard';
import ContactBar from '../components/details/ContactBar';
import RequestSummaryCard from '../components/details/RequestSummaryCard';

type Props = NativeStackScreenProps<RootStackParamList, 'DonorHelpDetail'>;

const DonorHelpDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { showModal } = useModal();
    const insets = useSafeAreaInsets();
    const { requestId } = route.params;

    // ─── STATE ──────────────────────────────────────────────────
    const [request, setRequest] = useState<DonationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [myMatch, setMyMatch] = useState<DonationMatch | null>(null);
    const [requester, setRequester] = useState<UserDocument | null>(null);

    const currentUser = useMemo(() => getAuth().currentUser, []);
    const { userData: currentUserData } = useAuth();

    const distance = useMemo(() => {
        if (currentUserData?.location && request?.location) {
            const d = getDistance(
                currentUserData.location.latitude,
                currentUserData.location.longitude,
                request.location.latitude,
                request.location.longitude
            );
            return Math.round(d * 10) / 10;
        }
        return undefined;
    }, [currentUserData, request]);

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

    // ─── EFFECTS ───────────────────────────────────────────────
    useEffect(() => {
        let unsubMatch: (() => void) | undefined;

        const initScreen = async () => {
            try {
                log('info', 'DonorHelpDetail', 'Loading details', { requestId });
                const reqData = await getDonationRequest(requestId);

                if (reqData) {
                    setRequest(reqData);
                    const userData = await getUserDocument(reqData.requesterId);
                    setRequester(userData);

                    unsubMatch = getMatchForDonor(requestId, currentUser?.uid || '', (match) => {
                        setMyMatch(match);
                    });
                } else {
                    showModal({
                        title: 'Request Not Found',
                        description: 'This blood request no longer exists.',
                        type: 'error',
                        primaryText: 'Go Back',
                        onPrimaryPress: () => navigation.goBack()
                    });
                }
            } catch (error: any) {
                log('error', 'DonorHelpDetail', 'Fetch failed', { error });
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

        initScreen();

        return () => {
            unsubMatch?.();
        };
    }, [requestId, currentUser?.uid, navigation, showModal]);

    // ─── ACTIONS ────────────────────────────────────────────────
    const handleWhatsApp = useCallback((phone: string) => {
        if (!request) return;
        const message = `Hi, I am reaching out regarding your urgent blood request for ${request.patientName} (${request.bloodGroup}) on BloodReach. I'm interested in helping.`;
        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

        Linking.openURL(url).catch(() =>
            showModal({ title: 'Cannot Open WhatsApp', description: 'WhatsApp is not installed.', type: 'error', primaryText: 'OK' })
        );
    }, [request, showModal]);

    const handleInterest = useCallback(async () => {
        if (!currentUser || !request || actionLoading) return;

        if (currentUserData?.schedule) {
            const available = isUserAvailableNow(currentUserData.schedule, new Date());
            if (!available) {
                showModal({
                    title: 'Outside Availability Hours',
                    description: 'You are currently outside your scheduled availability hours. You cannot express interest in donations at this time.',
                    type: 'warning',
                    primaryText: 'OK'
                });
                return;
            }
        }

        setActionLoading(true);
        await safeRun(
            () => createDonationMatch(requestId, currentUser.uid, request.requesterId),
            {
                context: 'DonorHelpDetail > handleInterest',
                errorTitle: 'Request Failed',
                showModal,
                onSuccess: () =>
                    showModal({ title: 'Request Sent ✓', description: 'The requester has been notified.', type: 'success', primaryText: 'OK' }),
            }
        );
        setActionLoading(false);
    }, [requestId, currentUser, request, actionLoading, showModal, currentUserData]);

    const handleComplete = useCallback(async () => {
        if (!currentUser || actionLoading) return;

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
                        errorTitle: 'Error',
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
    }, [requestId, currentUser, actionLoading, navigation, showModal]);

    const handleUpdateStatus = useCallback(async (newStatus: 'cancelled' | 'failed') => {
        if (!myMatch || actionLoading) return;
        setActionLoading(true);
        try {
            await updateMatchStatus(myMatch.id!, newStatus, myMatch);
        } catch (e) {
            showModal({ title: 'Error', description: 'Failed to update status.', type: 'error', primaryText: 'OK' });
        } finally {
            setActionLoading(false);
        }
    }, [myMatch, actionLoading, showModal]);

    // ─── RENDER ─────────────────────────────────────────────────
    if (loading) {
        return <LoadingScreen tagline="Fetching request details..." />;
    }

    if (!request) return null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <ScreenHeader
                title="Request Details"
                onBack={() => navigation.goBack()}
                topInset={insets.top}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
                <View style={styles.contentBody}>
                    <RequestSummaryCard
                        patientName={request.patientName}
                        bloodGroup={request.bloodGroup}
                        unitsRequired={request.unitsRequired}
                        urgencyLevel={request.urgencyLevel}
                        hospitalName={request.hospitalName}
                        hospitalAddress={request.hospitalAddress}
                        city={request.city}
                        distance={distance}
                        matchedDonorsCount={request.matchedDonorIds?.length || 0}
                        postedAt={getTimeAgo(request.createdAt)}
                        onGetDirections={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.hospitalName + " " + request.city)}`)}
                    />

                    <DetailInfoCard
                        title="Requested By"
                        imageUri={requester?.photoURL}
                        mainText={requester?.name || 'BloodReach User'}
                        subText={myMatch?.status === 'accepted' ? 'APPROVED DONOR' : 'Verified Requester'}
                        rightElement={myMatch?.status === 'accepted' ? <MaterialIcon name="check-circle" size={22} color="#22C55E" /> : <MaterialIcon name="verified" size={14} color="#16A34A" />}
                    >
                        {myMatch?.status === 'accepted' && (
                            <View style={styles.approvedContactArea}>
                                <ContactBar
                                    phone={request.phone}
                                    onWhatsApp={() => handleWhatsApp(request.phone)}
                                />
                                <TouchableOpacity
                                    style={styles.cancelActionBtn}
                                    onPress={() => handleUpdateStatus('cancelled')}
                                    disabled={actionLoading}
                                >
                                    <MaterialCommunityIcon name="close-circle-outline" size={20} color="#94A3B8" />
                                    <Text style={styles.cancelActionText}>Cancel Helping</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </DetailInfoCard>

                    <View style={styles.actionSection}>
                        {myMatch === null ? (
                            request.requesterId === currentUser?.uid ? (
                                <View style={styles.infoBoxGray}>
                                    <MaterialIcon name="info" size={20} color="#64748B" />
                                    <Text style={styles.infoBoxGrayText}>This is your own request.</Text>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleInterest} disabled={actionLoading}>
                                    {actionLoading ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <MaterialIcon name="favorite" size={22} color="#fff" style={styles.btnIcon} />
                                            <Text style={styles.primaryBtnText}>I Want to Donate</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )
                        ) : myMatch.status === 'pending' ? (
                            <TouchableOpacity
                                style={[styles.cancelActionBtn, { marginTop: 0 }]}
                                onPress={() => handleUpdateStatus('cancelled')}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator color="#94A3B8" /> : (
                                    <>
                                        <MaterialCommunityIcon name="close-circle-outline" size={20} color="#94A3B8" />
                                        <Text style={styles.cancelActionText}>Cancel Request</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : myMatch.status === 'accepted' ? null : myMatch.status === 'in_progress' ? (
                            <View style={styles.activeMatchCard}>
                                <View style={styles.matchStatusBanner}>
                                    <ActivityIndicator size="small" color="white" style={styles.btnIcon} />
                                    <Text style={styles.matchStatusText}>Donation in Progress</Text>
                                </View>

                                <View style={styles.matchContent}>
                                    <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} disabled={actionLoading}>
                                        <MaterialIcon name="check-circle" size={22} color="#fff" />
                                        <Text style={styles.completeBtnText}>Mark as Completed</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.failedBtn}
                                        onPress={() => handleUpdateStatus('failed')}
                                        disabled={actionLoading}
                                    >
                                        <MaterialIcon name="error-outline" size={20} color="#64748B" />
                                        <Text style={styles.failedBtnText}>Donation Failed</Text>
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
                            <View style={styles.infoBoxGray}>
                                <MaterialIcon name="info" size={22} color="#64748B" />
                                <Text style={styles.infoBoxGrayText}>This donation attempt ended ({myMatch.status}).</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollPadding: { paddingBottom: 60 },
    contentBody: { paddingHorizontal: 20, paddingTop: 20 },

    // ─── INFO CARDS & BUTTONS ────────────────────────────────────
    approvedContactArea: { marginTop: 12 },
    cancelActionBtn: { height: 50, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', gap: 8, marginTop: 12 },
    cancelActionText: { color: '#64748B', fontSize: 14, fontWeight: '700' },

    // ─── PRIMARY ACTIONS ──────────────────────────────────────────
    actionSection: { marginTop: 0, marginBottom: 20 },
    primaryBtn: { backgroundColor: '#B62022', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#B62022', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    btnIcon: { marginRight: 8 },

    // ─── STATUS COMPONENTS ────────────────────────────────────────
    pendingStatusBox: { backgroundColor: 'white', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
    pendingStatusText: { color: '#64748B', fontSize: 15, fontWeight: '600' },

    activeMatchCard: { backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
    matchStatusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#1E293B', gap: 8 },
    matchStatusText: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    matchContent: { padding: 20 },

    completeBtn: { backgroundColor: '#16A34A', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    completeBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

    failedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, height: 50, gap: 8 },
    failedBtnText: { color: '#64748B', fontSize: 14, fontWeight: '700' },

    successBox: { alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 24, padding: 30, borderWidth: 1, borderColor: '#BBF7D0' },
    successTitle: { fontSize: 22, fontWeight: '900', color: '#166534', marginTop: 12 },
    successSub: { fontSize: 14, color: '#15803D', marginTop: 4, fontWeight: '600' },

    infoBoxGray: { backgroundColor: '#F1F5F9', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    infoBoxGrayText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});

export default DonorHelpDetailScreen;
