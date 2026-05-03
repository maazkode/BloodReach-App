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
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getAuth } from '@react-native-firebase/auth';
import { getDonationRequest, updateDonationRequest, completeDonation } from '../services/firestoreService';
import { DonationRequest } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetail'>;

const RequestDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { requestId } = route.params;
    const [request, setRequest] = useState<DonationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const currentUser = getAuth().currentUser;

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const data = await getDonationRequest(requestId);
                if (data) {
                    setRequest(data);
                } else {
                    Alert.alert('Error', 'Request not found.');
                    navigation.goBack();
                }
            } catch (error) {
                console.error('Fetch error:', error);
                Alert.alert('Error', 'Could not load request details.');
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();
    }, [requestId]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#B62022" />
            </View>
        );
    }

    if (!request) return null;

    const isRequester = request.requesterId === currentUser?.uid;
    const isMatched = (request.matchedDonorIds || []).includes(currentUser?.uid || '');

    const handleWhatsApp = (phone: string, name: string) => {
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
            Alert.alert('Error', 'Could not open WhatsApp.');
        });
    };

    const handleHelpNow = async () => {
        if (!currentUser) return;

        setActionLoading(true);
        try {
            const updatedMatchedIds = [...request.matchedDonorIds, currentUser.uid];
            await updateDonationRequest(requestId, {
                matchedDonorIds: updatedMatchedIds,
                status: 'matched'
            });
            Alert.alert('Success', "You've been matched! Please contact the requester immediately.");
            // Refresh local state
            setRequest(prev => prev ? { ...prev, matchedDonorIds: updatedMatchedIds, status: 'matched' } : null);
        } catch (error) {
            Alert.alert('Error', 'Could not process your request. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteDonation = async () => {
        if (!currentUser) return;

        Alert.alert(
            'Complete Donation',
            'Have you successfully donated blood for this patient?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, I Donated',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await completeDonation(requestId, currentUser.uid);
                            Alert.alert('Thank You!', 'You have saved a life today. Your profile will be on a 3-month cooldown.');
                            navigation.replace('DonorDashboard');
                        } catch (error) {
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderTimeline = () => {
        const step = request.status === 'completed' ? 3 : request.status === 'matched' ? 2 : 1;
        return (
            <View style={styles.timelineContainer}>
                <View style={styles.timelineLineBg} />
                <View style={[styles.timelineLineActive, { width: step === 1 ? '15%' : step === 2 ? '50%' : '100%' }]} />
                <View style={styles.timelineSteps}>
                    <View style={styles.timelineStep}>
                        <View style={[styles.timelineDot, step >= 1 && styles.timelineDotActive]}><MaterialIcon name="check" size={14} color="#fff" /></View>
                        <Text style={[styles.timelineText, step >= 1 && styles.timelineTextActive]}>Created</Text>
                    </View>
                    <View style={styles.timelineStep}>
                        <View style={[styles.timelineDot, step >= 2 && styles.timelineDotActive]}>{step >= 2 && <MaterialIcon name="check" size={14} color="#fff" />}</View>
                        <Text style={[styles.timelineText, step >= 2 && styles.timelineTextActive]}>Matched</Text>
                    </View>
                    <View style={styles.timelineStep}>
                        <View style={[styles.timelineDot, step >= 3 && styles.timelineDotActive]}>{step >= 3 && <MaterialIcon name="check" size={14} color="#fff" />}</View>
                        <Text style={[styles.timelineText, step >= 3 && styles.timelineTextActive]}>Fulfilled</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isRequester ? 'Request Control' : 'Donation Details'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderTimeline()}

                <View style={styles.patientCard}>
                    <View style={styles.patientTop}>
                        <View style={styles.bloodBadge}>
                            <Text style={styles.bloodBadgeText}>{request.bloodGroup}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.patientName}>{request.patientName}</Text>
                            <Text style={styles.unitsNeeded}>{request.unitsRequired} Unit{request.unitsRequired > 1 ? 's' : ''} Needed</Text>
                        </View>
                        {request.urgencyLevel === 'urgent' && (
                            <View style={styles.urgentTag}>
                                <Text style={styles.urgentTagText}>EMERGENCY</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.locationRow}>
                        <View style={styles.locIcon}><MaterialIcon name="local-hospital" size={18} color="#B62022" /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.hospitalName}>{request.hospitalName}</Text>
                            <Text style={styles.hospitalAddress}>{request.hospitalAddress}, {request.city}</Text>
                        </View>
                    </View>
                </View>

                {!isRequester && (
                    <View style={styles.contactCard}>
                        <Text style={styles.sectionTitle}>Contact Requester</Text>
                        <View style={styles.contactRow}>
                            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${request.phone}`)}>
                                <MaterialIcon name="phone" size={24} color="#B62022" />
                                <Text style={styles.contactBtnText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#E7F9ED' }]} onPress={() => handleWhatsApp(request.phone, 'Requester')}>
                                <MaterialCommunityIcon name="whatsapp" size={24} color="#16A34A" />
                                <Text style={[styles.contactBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {!isRequester && !isMatched && request.status === 'open' && (
                    <TouchableOpacity
                        style={styles.fulfillBtn}
                        onPress={handleHelpNow}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <MaterialIcon name="favorite" size={22} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.fulfillBtnText}>Accept & Help Now</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {isMatched && request.status !== 'completed' && (
                    <TouchableOpacity
                        style={styles.fulfillBtn}
                        onPress={handleCompleteDonation}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <MaterialIcon name="check-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.fulfillBtnText}>I have Donated</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {isRequester && request.status !== 'completed' && (
                    <TouchableOpacity style={styles.fulfillBtn} onPress={() => {
                        Alert.alert('Success', 'Request marked as fulfilled!');
                        navigation.goBack();
                    }}>
                        <MaterialIcon name="check-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.fulfillBtnText}>Mark as Fulfilled</Text>
                    </TouchableOpacity>
                )}

                {!isRequester && (
                    <TouchableOpacity
                        style={styles.mapBtn}
                        onPress={() => {
                            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.hospitalName + " " + request.city)}`;
                            Linking.openURL(url);
                        }}
                    >
                        <MaterialIcon name="map" size={22} color="#1E293B" style={{ marginRight: 8 }} />
                        <Text style={styles.mapBtnText}>Open in Google Maps</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    scrollContent: { padding: 20, paddingBottom: 60 },

    timelineContainer: { marginBottom: 30, marginTop: 10, position: 'relative' },
    timelineLineBg: { position: 'absolute', top: 12, left: 20, right: 20, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
    timelineLineActive: { position: 'absolute', top: 12, left: 20, height: 4, backgroundColor: '#B62022', borderRadius: 2 },
    timelineSteps: { flexDirection: 'row', justifyContent: 'space-between' },
    timelineStep: { alignItems: 'center', width: 60 },
    timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#F8FAFC' },
    timelineDotActive: { backgroundColor: '#B62022' },
    timelineText: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 6 },
    timelineTextActive: { color: '#1E293B', fontWeight: '800' },

    patientCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    patientTop: { flexDirection: 'row', alignItems: 'center' },
    bloodBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FDECEC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
    bloodBadgeText: { fontSize: 20, fontWeight: '900', color: '#B62022' },
    patientName: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
    unitsNeeded: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 4 },
    urgentTag: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    urgentTagText: { color: '#B62022', fontSize: 10, fontWeight: '900' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    hospitalName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    hospitalAddress: { fontSize: 13, color: '#64748B', marginTop: 2 },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },

    contactCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    contactRow: { flexDirection: 'row', gap: 12 },
    contactBtn: { flex: 1, backgroundColor: '#FDECEC', height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    contactBtnText: { color: '#B62022', fontSize: 14, fontWeight: '800', marginTop: 4 },

    fulfillBtn: { backgroundColor: '#B62022', height: 56, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#B62022', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    fulfillBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

    mapBtn: { height: 56, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white' },
    mapBtnText: { color: '#1E293B', fontSize: 15, fontWeight: '700' }
});

export default RequestDetailScreen;
