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

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetail'>;

// Mock Data to match dashboard UI state
const MOCK_REQUESTS: any = {
    '1': { id: '1', requesterId: 'me', patientName: 'Ali Khan', bloodGroup: 'O+', unitsRequired: 2, hospitalName: "St. Mary's Hospital", hospitalAddress: "123 Main St", city: 'Islamabad', urgencyLevel: 'urgent', status: 'open', matchedDonorIds: ['d1', 'd2'], phone: '03001234567' },
    '2': { id: '2', requesterId: 'me', patientName: 'Sarah Ahmed', bloodGroup: 'A-', unitsRequired: 1, hospitalName: 'City Hospital', hospitalAddress: "45 Park Avenue", city: 'Lahore', urgencyLevel: 'normal', status: 'matched', matchedDonorIds: ['d3'], phone: '03007654321' },
    '3': { id: '3', requesterId: 'me', patientName: 'Zainab Bibi', bloodGroup: 'B+', unitsRequired: 3, hospitalName: 'General Hospital', hospitalAddress: "78 Central Rd", city: 'Karachi', urgencyLevel: 'normal', status: 'completed', matchedDonorIds: ['d4'], phone: '03001112222' }
};

const MOCK_DONORS: any = {
    'd1': { name: 'John Doe', distance: '2 km away', status: 'On the way', phone: '03000000001' },
    'd2': { name: 'Ahmad Raza', distance: '5 km away', status: 'Accepted', phone: '03000000002' },
    'd3': { name: 'Kamran Ali', distance: '1 km away', status: 'Reached Hospital', phone: '03000000003' },
    'd4': { name: 'Saad Tariq', distance: '0 km away', status: 'Donated', phone: '03000000004' }
};

const RequestDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { requestId } = route.params;
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate fetch for premium UI demo
        setTimeout(() => {
            if (MOCK_REQUESTS[requestId]) {
                setRequest(MOCK_REQUESTS[requestId]);
            } else {
                Alert.alert('Error', 'Request not found.');
                navigation.goBack();
            }
            setLoading(false);
        }, 600);
    }, [requestId]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#B62022" />
            </View>
        );
    }

    if (!request) return null;

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

    const renderDonors = () => {
        if (!request.matchedDonorIds || request.matchedDonorIds.length === 0) {
            return (
                <View style={styles.emptyDonors}>
                    <ActivityIndicator size="small" color="#B62022" style={{ marginRight: 12 }} />
                    <Text style={styles.emptyDonorsText}>Broadcasting to nearby donors...</Text>
                </View>
            );
        }

        const handleWhatsApp = (donorPhone: string, donorName: string) => {
            const message = `Hi ${donorName}, I am reaching out regarding the urgent blood request for ${request.patientName} (${request.bloodGroup}). Are you still available to donate?`;
            const url = `whatsapp://send?phone=${donorPhone}&text=${encodeURIComponent(message)}`;
            
            Linking.canOpenURL(url).then(supported => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Linking.openURL(`https://wa.me/${donorPhone}?text=${encodeURIComponent(message)}`);
                }
            }).catch(() => {
                Alert.alert('Error', 'Could not open WhatsApp.');
            });
        };

        return (
            <View style={styles.donorsList}>
                {request.matchedDonorIds.map((dId: string) => {
                    const donor = MOCK_DONORS[dId];
                    if(!donor) return null;
                    return (
                        <View key={dId} style={styles.donorCard}>
                            <View style={styles.donorInfoRow}>
                                <View style={styles.donorAvatar}><Text style={styles.donorAvatarText}>{donor.name.charAt(0)}</Text></View>
                                <View style={styles.donorDetails}>
                                    <Text style={styles.donorName}>{donor.name}</Text>
                                    <Text style={styles.donorSub}>{donor.distance} • <Text style={{color: '#16A34A', fontWeight: '800'}}>{donor.status}</Text></Text>
                                </View>
                            </View>
                            <View style={styles.donorActions}>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${donor.phone}`)}>
                                    <MaterialIcon name="phone" size={20} color="#1E293B" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.iconBtn, { backgroundColor: '#25D366', borderColor: '#25D366' }]}
                                    onPress={() => handleWhatsApp(donor.phone, donor.name)}
                                >
                                    <MaterialCommunityIcon name="whatsapp" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Request Control</Text>
                <View style={{width: 24}}/>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderTimeline()}

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

                <Text style={styles.sectionTitle}>Matched Donors</Text>
                {renderDonors()}
                
                <Text style={styles.sectionTitle}>Manage Request</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <MaterialIcon name="share" size={22} color="#1E293B" />
                        <Text style={styles.actionBtnText}>Share Alert</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <MaterialIcon name="edit" size={22} color="#1E293B" />
                        <Text style={styles.actionBtnText}>Edit Request</Text>
                    </TouchableOpacity>
                </View>

                {request.status !== 'completed' && (
                    <TouchableOpacity style={styles.fulfillBtn} onPress={() => {
                        Alert.alert('Success', 'Request marked as fulfilled!');
                        navigation.goBack();
                    }}>
                        <MaterialIcon name="check-circle" size={22} color="#fff" style={{marginRight: 8}} />
                        <Text style={styles.fulfillBtnText}>Mark as Fulfilled</Text>
                    </TouchableOpacity>
                )}
                
                {request.status !== 'completed' && (
                    <TouchableOpacity style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>Cancel Request</Text>
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
    
    emptyDonors: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    emptyDonorsText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    
    donorsList: { marginBottom: 24 },
    donorCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
    donorInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    donorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    donorAvatarText: { fontSize: 18, fontWeight: '800', color: '#475569' },
    donorDetails: { marginLeft: 12, flex: 1 },
    donorName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    donorSub: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
    donorActions: { flexDirection: 'row', gap: 8 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    
    actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
    actionBtn: { flex: 1, backgroundColor: 'white', height: 56, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    actionBtnText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: '#1E293B' },
    
    fulfillBtn: { backgroundColor: '#16A34A', height: 56, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#16A34A', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    fulfillBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    
    cancelBtn: { height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelBtnText: { color: '#94A3B8', fontSize: 15, fontWeight: '700' }
});

export default RequestDetailScreen;
