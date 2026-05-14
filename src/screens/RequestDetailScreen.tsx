import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getAuth } from '@react-native-firebase/auth';
import {
    getDonationRequest,
    updateDonationRequest,
    completeDonation,
    getMatchesForRequest,
    updateMatchStatus,
    getUserDocument,
    createDonationMatch,
    getMatchForDonor
} from '../api/firestoreService';
import { DonationRequest, DonationMatch, UserDocument } from '../types/database';
import { useModal } from '../context/ModalContext';
import LoadingScreen from '../components/common/LoadingScreen';
import ScreenHeader from '../components/common/ScreenHeader';
import Timeline from '../components/details/Timeline';
import DetailInfoCard from '../components/details/DetailInfoCard';
import ContactBar from '../components/details/ContactBar';
import PatientHeroCard from '../components/details/PatientHeroCard';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetail'>;

const RequestDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { showModal } = useModal();
    const { requestId } = route.params;

    // ─── STATE ──────────────────────────────────────────────────
    const [request, setRequest] = useState<DonationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [matches, setMatches] = useState<(DonationMatch & { donor?: UserDocument })[]>([]);
    const [myMatch, setMyMatch] = useState<DonationMatch | null>(null);

    const currentUser = useMemo(() => getAuth().currentUser, []);
    const isRequester = useMemo(() => request?.requesterId === currentUser?.uid, [request, currentUser]);
    const isMatched = useMemo(() => 
        currentUser?.uid && request?.matchedDonorIds 
            ? request.matchedDonorIds.includes(currentUser.uid) 
            : false, 
    [request, currentUser]);

    // ─── EFFECTS ───────────────────────────────────────────────
    useEffect(() => {
        let unsubMatches: (() => void) | undefined;
        let unsubMyMatch: (() => void) | undefined;

        const initScreen = async () => {
            try {
                const data = await getDonationRequest(requestId);
                if (data) {
                    setRequest(data);

                    if (data.requesterId === currentUser?.uid) {
                        unsubMatches = getMatchesForRequest(requestId, async (matchList) => {
                            const enhanced = await Promise.all(matchList.map(async (m) => {
                                const donorProfile = await getUserDocument(m.donorId);
                                return { ...m, donor: donorProfile || undefined };
                            }));
                            setMatches(enhanced);
                        });
                    } else {
                        unsubMyMatch = getMatchForDonor(requestId, currentUser?.uid || '', (match) => {
                            setMyMatch(match);
                        });
                    }
                } else {
                    showModal({
                        title: 'Error',
                        description: 'Request not found.',
                        type: 'error',
                        primaryText: 'Back',
                        onPrimaryPress: () => navigation.goBack()
                    });
                }
            } catch (error) {
                console.error('[RequestDetail] Fetch error:', error);
                showModal({
                    title: 'Error',
                    description: 'Could not load request details.',
                    type: 'error',
                    primaryText: 'OK'
                });
            } finally {
                setLoading(false);
            }
        };

        initScreen();

        return () => {
            unsubMatches?.();
            unsubMyMatch?.();
        };
    }, [requestId, currentUser?.uid, navigation, showModal]);

    // ─── ACTIONS ────────────────────────────────────────────────
    const handleWhatsApp = useCallback((phone: string, name: string) => {
        if (!request) return;
        const message = isRequester
            ? `Hi ${name}, I am reaching out regarding the urgent blood request for ${request.patientName} (${request.bloodGroup}). Are you still available to donate?`
            : `Hi, I am reaching out regarding your urgent blood request for ${request.patientName} (${request.bloodGroup}). I'm interested in helping.`;

        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
            }
        }).catch(() => {
            showModal({ title: 'Error', description: 'Could not open WhatsApp.', type: 'error', primaryText: 'OK' });
        });
    }, [isRequester, request, showModal]);

    const handleAcceptMatch = useCallback(async (match: DonationMatch, donorName: string) => {
        if (!request) return;
        setActionLoading(true);
        try {
            await updateMatchStatus(match.id!, 'accepted', match);
            const updatedMatchedIds = [...(request.matchedDonorIds || []), match.donorId];
            await updateDonationRequest(requestId, {
                matchedDonorIds: updatedMatchedIds,
                status: 'matched'
            });

            showModal({ title: 'Match Accepted', description: `You can now contact ${donorName}.`, type: 'success', primaryText: 'Great' });
        } catch (error) {
            showModal({ title: 'Error', description: 'Could not accept donor.', type: 'error', primaryText: 'OK' });
        } finally {
            setActionLoading(false);
        }
    }, [requestId, request, showModal]);

    const handleRejectMatch = useCallback(async (match: DonationMatch) => {
        showModal({
            title: 'Reject Donor',
            description: 'Are you sure you want to reject this donor?',
            type: 'danger',
            primaryText: 'Reject',
            onPrimaryPress: async () => {
                setActionLoading(true);
                try {
                    await updateMatchStatus(match.id!, 'rejected', match);
                } catch (e) {
                    showModal({ title: 'Error', description: 'Could not reject.', type: 'error', primaryText: 'OK' });
                } finally {
                    setActionLoading(false);
                }
            },
            secondaryText: 'Cancel'
        });
    }, [showModal]);

    const handleCancelMatch = useCallback(async (match: DonationMatch) => {
        if (!request) return;
        showModal({
            title: 'Cancel Match',
            description: 'Are you sure you want to cancel this match?',
            type: 'danger',
            primaryText: 'Yes, Cancel',
            onPrimaryPress: async () => {
                setActionLoading(true);
                try {
                    await updateMatchStatus(match.id!, 'cancelled', match);
                    const updatedMatchedIds = (request.matchedDonorIds || []).filter(id => id !== match.donorId);
                    await updateDonationRequest(requestId, {
                        matchedDonorIds: updatedMatchedIds,
                        status: updatedMatchedIds.length > 0 ? 'matched' : 'open'
                    });
                } catch (e) {
                    showModal({ title: 'Error', description: 'Could not cancel match.', type: 'error', primaryText: 'OK' });
                } finally {
                    setActionLoading(false);
                }
            },
            secondaryText: 'Keep Match'
        });
    }, [requestId, request, showModal]);

    const handleInterest = useCallback(async () => {
        if (!currentUser || !request || actionLoading) return;

        setActionLoading(true);
        try {
            await createDonationMatch(requestId, currentUser.uid, request.requesterId);
            showModal({ title: 'Request Sent', description: 'The requester has been notified. You can see their contact once they accept.', type: 'success', primaryText: 'OK' });
        } catch (error: any) {
            showModal({ title: 'Error', description: error.message || 'Could not send request.', type: 'error', primaryText: 'OK' });
        } finally {
            setActionLoading(false);
        }
    }, [requestId, currentUser, request, actionLoading, showModal]);

    const handleCompleteDonation = useCallback(async () => {
        if (!currentUser) return;

        showModal({
            title: 'Complete Donation',
            description: 'Have you successfully donated blood for this patient?',
            type: 'info',
            primaryText: 'Yes, I Donated',
            onPrimaryPress: async () => {
                setActionLoading(true);
                try {
                    await completeDonation(requestId, currentUser.uid);
                    showModal({
                        title: 'Thank You! 🩸',
                        description: 'You have saved a life today. Your profile will be on a 3-month cooldown.',
                        type: 'success',
                        primaryText: 'Finish',
                        onPrimaryPress: () => navigation.replace('DonorDashboard', {})
                    });
                } catch (error) {
                    showModal({ title: 'Error', description: 'Something went wrong. Please try again.', type: 'error', primaryText: 'OK' });
                } finally {
                    setActionLoading(false);
                }
            },
            secondaryText: 'No'
        });
    }, [requestId, currentUser, navigation, showModal]);

    const handleMarkFulfilled = useCallback(() => {
        Alert.alert('Success', 'Request marked as fulfilled!');
        navigation.goBack();
    }, [navigation]);

    const handleOpenMaps = useCallback(() => {
        if (!request) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.hospitalName + " " + request.city)}`;
        Linking.openURL(url);
    }, [request]);

    // ─── RENDER ─────────────────────────────────────────────────
    if (loading) {
        return <LoadingScreen tagline="Loading request details..." />;
    }

    if (!request) return null;

    return (
        <View style={styles.container}>
            <ScreenHeader 
                title={isRequester ? 'Request Control' : 'Donation Details'} 
                onBack={() => navigation.goBack()} 
                topInset={insets.top} 
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Timeline status={request.status} />

                <PatientHeroCard 
                    patientName={request.patientName}
                    bloodGroup={request.bloodGroup}
                    unitsRequired={request.unitsRequired}
                    urgencyLevel={request.urgencyLevel}
                    statusLabel={request.status.toUpperCase()}
                />

                <View style={styles.contentBody}>
                    <DetailInfoCard 
                        title="Hospital Location"
                        icon="local-hospital"
                        mainText={request.hospitalName}
                        subText={`${request.hospitalAddress}, ${request.city}`}
                    >
                        {!isRequester && (
                            <TouchableOpacity style={styles.mapActionBtn} onPress={handleOpenMaps}>
                                <MaterialIcon name="directions" size={20} color="#B62022" />
                                <Text style={styles.mapActionText}>Get Directions</Text>
                            </TouchableOpacity>
                        )}
                    </DetailInfoCard>

                    {isRequester && (
                        <View style={styles.matchesSection}>
                            <Text style={styles.sectionTitleSmall}>Interested Donors ({matches.length})</Text>
                            {matches.length === 0 ? (
                                <DetailInfoCard 
                                    mainText="Searching for Donors..."
                                    subText="We've notified nearby heroes."
                                    icon="account-search-outline"
                                />
                            ) : (
                                matches.map((m) => (
                                    <DetailInfoCard
                                        key={m.id}
                                        mainText={m.donor?.name || 'Anonymous Donor'}
                                        subText={m.status.toUpperCase()}
                                        imageUri={m.donor?.photoURL}
                                        rightElement={m.status === 'accepted' ? <MaterialIcon name="check-circle" size={22} color="#16A34A" /> : undefined}
                                        style={styles.donorCard}
                                    >
                                        {m.status === 'pending' ? (
                                            <View style={styles.matchActions}>
                                                <TouchableOpacity
                                                    style={[styles.smallBtn, styles.rejectBtn]}
                                                    onPress={() => handleRejectMatch(m)}
                                                    disabled={actionLoading}
                                                >
                                                    <Text style={styles.rejectBtnText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.smallBtn, styles.acceptBtn]}
                                                    onPress={() => handleAcceptMatch(m, m.donor?.name || 'Donor')}
                                                    disabled={actionLoading}
                                                >
                                                    <Text style={styles.acceptBtnText}>Accept</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : m.status === 'accepted' ? (
                                            <View>
                                                <ContactBar 
                                                    phone={m.donor?.phone || ''} 
                                                    onWhatsApp={() => handleWhatsApp(m.donor?.phone || '', m.donor?.name || 'Donor')}
                                                />
                                                <TouchableOpacity 
                                                    style={styles.cancelMatchBtn}
                                                    onPress={() => handleCancelMatch(m)}
                                                >
                                                    <MaterialIcon name="close" size={18} color="#64748B" />
                                                    <Text style={styles.cancelMatchBtnText}>Cancel Match</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <Text style={styles.rejectedText}>You declined this offer.</Text>
                                        )}
                                    </DetailInfoCard>
                                ))
                            )}
                        </View>
                    )}

                    {!isRequester && myMatch?.status === 'accepted' && (
                        <DetailInfoCard 
                            title="Direct Contact"
                            mainText="Connection established"
                            subText="You can now coordinate with the requester"
                            icon="person"
                        >
                            <ContactBar 
                                phone={request.phone} 
                                onWhatsApp={() => handleWhatsApp(request.phone, 'Requester')} 
                            />
                        </DetailInfoCard>
                    )}

                    {!isRequester && myMatch?.status === 'pending' && (
                        <View style={styles.statusBox}>
                            <ActivityIndicator size="small" color="#B62022" style={styles.statusIcon} />
                            <Text style={styles.statusBoxText}>Request Sent. Waiting for approval...</Text>
                        </View>
                    )}

                    {!isRequester && !myMatch && request.status === 'open' && (
                        <TouchableOpacity
                            style={styles.primaryActionBtn}
                            onPress={handleInterest}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <MaterialIcon name="favorite" size={22} color="#fff" style={styles.btnIcon} />
                                    <Text style={styles.primaryActionText}>I Want to Help</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {isRequester && request.status === 'open' && !myMatch && (
                        <View style={styles.selfRequestNote}>
                            <MaterialIcon name="info" size={20} color="#64748B" style={styles.statusIcon} />
                            <Text style={styles.selfRequestNoteText}>This is your own request.</Text>
                        </View>
                    )}

                    {isMatched && request.status !== 'completed' && (
                        <TouchableOpacity
                            style={styles.primaryActionBtn}
                            onPress={handleCompleteDonation}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <MaterialIcon name="check-circle" size={22} color="#fff" style={styles.btnIcon} />
                                    <Text style={styles.primaryActionText}>I have Donated</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {isRequester && request.status !== 'completed' && request.status !== 'cancelled' && (
                        <TouchableOpacity style={styles.primaryActionBtn} onPress={handleMarkFulfilled}>
                            <MaterialIcon name="check-circle" size={22} color="#fff" style={styles.btnIcon} />
                            <Text style={styles.primaryActionText}>Mark as Fulfilled</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingBottom: 60 },
    contentBody: { paddingHorizontal: 20, paddingTop: 20 },
    
    // ─── ACTION BUTTONS ──────────────────────────────────────────
    primaryActionBtn: { 
        backgroundColor: '#B62022', 
        height: 56, 
        borderRadius: 16, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 16, 
        shadowColor: '#B62022', 
        shadowOpacity: 0.3, 
        shadowRadius: 8, 
        elevation: 4 
    },
    primaryActionText: { color: 'white', fontSize: 16, fontWeight: '800' },
    btnIcon: { marginRight: 8 },

    mapActionBtn: { 
        height: 44, 
        borderRadius: 12, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#FEE2E2', 
        backgroundColor: '#FEF2F2',
        marginTop: 12,
        gap: 8
    },
    mapActionText: { color: '#B62022', fontSize: 14, fontWeight: '700' },

    // ─── MATCHES SECTION ─────────────────────────────────────────
    matchesSection: { marginTop: 8, marginBottom: 24 },
    sectionTitleSmall: { fontSize: 12, fontWeight: '900', color: '#94A3B8', marginBottom: 10, marginLeft: 4, letterSpacing: 1, textTransform: 'uppercase' },
    donorCard: { marginBottom: 12 },
    matchActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    smallBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    rejectBtn: { backgroundColor: '#F1F5F9' },
    rejectBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
    acceptBtn: { backgroundColor: '#B62022' },
    acceptBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
    
    cancelMatchBtn: { 
        height: 48, 
        borderRadius: 12, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#F1F5F9', 
        backgroundColor: '#F8FAFC', 
        marginTop: 12, 
        gap: 6 
    },
    cancelMatchBtnText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
    rejectedText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8, marginTop: 8 },

    // ─── STATUS BOXES ────────────────────────────────────────────
    statusBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FEE2E2' },
    statusBoxText: { color: '#B62022', fontWeight: '700', fontSize: 14 },
    statusIcon: { marginRight: 10 },
    
    selfRequestNote: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    selfRequestNoteText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
});

export default RequestDetailScreen;
