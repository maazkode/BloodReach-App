import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getAuth } from '@react-native-firebase/auth';
import { 
    getDonationRequest, 
    createDonationMatch, 
    getMatchForDonor, 
    completeDonation,
    getUserDocument 
} from '../services/firestoreService';
import { DonationRequest, DonationMatch, UserDocument } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'DonorHelpDetail'>;

const DonorHelpDetailScreen: React.FC<Props> = ({ route, navigation }) => {
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
                const reqData = await getDonationRequest(requestId);
                if (reqData) {
                    setRequest(reqData);
                    
                    // Fetch requester details
                    const userData = await getUserDocument(reqData.requesterId);
                    setRequester(userData);

                    // Listen for match status
                    const unsub = getMatchForDonor(requestId, currentUser?.uid || '', (match) => {
                        setMyMatch(match);
                    });
                    return () => unsub();
                } else {
                    Alert.alert('Error', 'Request not found.');
                    navigation.goBack();
                }
            } catch (error) {
                console.error('Fetch error:', error);
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
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
    };

    const handleInterest = async () => {
        if (!currentUser || !request) return;
        setActionLoading(true);
        try {
            await createDonationMatch(requestId, currentUser.uid, request.requesterId);
            Alert.alert('Request Sent', 'The requester has been notified. You can see their contact once they accept.');
        } catch (error) {
            Alert.alert('Error', 'Could not send request.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!currentUser) return;
        Alert.alert(
            'Confirm Donation',
            'Have you successfully donated blood?',
            [
                { text: 'No', style: 'cancel' },
                { 
                    text: 'Yes', 
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await completeDonation(requestId, currentUser.uid);
                            Alert.alert('Thank You', 'You saved a life!');
                            navigation.replace('DonorDashboard');
                        } catch (e) { Alert.alert('Error', 'Update failed'); }
                        finally { setActionLoading(false); }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Patient</Text>
                <View style={{width: 24}}/>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.patientCard}>
                    <View style={styles.patientTop}>
                        <View style={styles.bloodBadge}>
                            <Text style={styles.bloodBadgeText}>{request.bloodGroup}</Text>
                        </View>
                        <View style={{flex: 1, marginLeft: 16}}>
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
                        <View style={{flex: 1, marginLeft: 12}}>
                            <Text style={styles.hospitalName}>{request.hospitalName}</Text>
                            <Text style={styles.hospitalAddress}>{request.hospitalAddress}, {request.city}</Text>
                        </View>
                    </View>
                </View>

                {/* Requester Info Section */}
                <View style={styles.requesterCard}>
                    <Text style={styles.sectionTitleSmall}>Requested By</Text>
                    <View style={styles.requesterRow}>
                        <View style={styles.avatarPlaceholder}>
                            <MaterialIcon name="person" size={20} color="#64748B" />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.requesterName}>{requester?.name || 'BloodReach User'}</Text>
                            <Text style={styles.requesterLabel}>Registered Requester</Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <MaterialIcon name="verified" size={16} color="#16A34A" />
                        </View>
                    </View>
                </View>

                {/* Match Status Logic */}
                {!myMatch ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={handleInterest} disabled={actionLoading}>
                        {actionLoading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <MaterialIcon name="favorite" size={22} color="#fff" style={{marginRight: 8}} />
                                <Text style={styles.actionBtnText}>I Want to Donate</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : myMatch.status === 'pending' ? (
                    <View style={styles.statusBox}>
                        <ActivityIndicator size="small" color="#B62022" style={{marginRight: 10}} />
                        <Text style={styles.statusBoxText}>Request Sent. Waiting for approval...</Text>
                    </View>
                ) : myMatch.status === 'accepted' ? (
                    <View style={styles.contactSection}>
                        <Text style={styles.sectionTitle}>Contact Details</Text>
                        <View style={styles.contactRow}>
                             <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${request.phone}`)}>
                                <MaterialIcon name="phone" size={24} color="#B62022" />
                                <Text style={styles.contactBtnText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, {backgroundColor: '#E7F9ED'}]} onPress={() => handleWhatsApp(request.phone, 'Requester')}>
                                <MaterialCommunityIcon name="whatsapp" size={24} color="#16A34A" />
                                <Text style={[styles.contactBtnText, {color: '#16A34A'}]}>WhatsApp</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={[styles.actionBtn, {marginTop: 24}]} onPress={handleComplete}>
                            <MaterialIcon name="check-circle" size={22} color="#fff" style={{marginRight: 8}} />
                            <Text style={styles.actionBtnText}>Mark as Donated</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.statusBox, {backgroundColor: '#F1F5F9'}]}>
                        <MaterialIcon name="error-outline" size={20} color="#64748B" style={{marginRight: 10}} />
                        <Text style={[styles.statusBoxText, {color: '#64748B'}]}>Another donor has been chosen.</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.mapBtn}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.hospitalName + " " + request.city)}`)}
                >
                    <MaterialIcon name="map" size={22} color="#1E293B" style={{marginRight: 8}} />
                    <Text style={styles.mapBtnText}>Directions in Maps</Text>
                </TouchableOpacity>
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
    scrollContent: { padding: 20 },
    
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
    
    actionBtn: { backgroundColor: '#B62022', height: 56, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#B62022', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    actionBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    
    statusBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    statusBoxText: { color: '#B62022', fontWeight: '700', fontSize: 14 },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
    contactSection: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    contactRow: { flexDirection: 'row', gap: 12 },
    contactBtn: { flex: 1, backgroundColor: '#FDECEC', height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    contactBtnText: { color: '#B62022', fontSize: 14, fontWeight: '800', marginTop: 4 },

    mapBtn: { height: 56, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white', marginTop: 16 },
    mapBtnText: { color: '#1E293B', fontSize: 15, fontWeight: '700' },

    requesterCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    sectionTitleSmall: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
    requesterRow: { flexDirection: 'row', alignItems: 'center' },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    requesterName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    requesterLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    verifiedBadge: { padding: 4 }
});

export default DonorHelpDetailScreen;
