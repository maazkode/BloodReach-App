import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { subscribeToRequests, createDonationRequest } from '../services/firestoreService';
import { DonationRequest } from '../types/database';
import { getAuth } from '@react-native-firebase/auth';

const BloodRequestFeedScreen: React.FC = () => {
    const [requests, setRequests] = useState<DonationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    // Form State
    const [patientName, setPatientName] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [units, setUnits] = useState('1');
    const [hospital, setHospital] = useState('');
    const [city, setCity] = useState('');

    useEffect(() => {
        // 1. Subscribe to real-time updates
        console.log('Subscribing to requests...');
        const unsubscribe = subscribeToRequests((newRequests) => {
            console.log('Received real-time update:', newRequests.length, 'requests');
            setRequests(newRequests);
            setLoading(false);
        });

        // 2. Cleanup: Unsubscribe from listener when component unmounts
        return () => {
            console.log('Unsubscribing from requests...');
            unsubscribe();
        };
    }, []);

    const handleAddRequest = async () => {
        if (!patientName || !bloodGroup || !hospital || !city) {
            Alert.alert('Error', 'Please fill in all mandatory fields');
            return;
        }

        const currentUser = getAuth().currentUser;
        if (!currentUser) {
            Alert.alert('Error', 'You must be logged in to post a request');
            return;
        }

        setIsPosting(true);
        console.log('Attempting to post request for:', patientName);

        try {
            const newRequest: Omit<DonationRequest, 'id' | 'createdAt' | 'updatedAt'> = {
                requesterId: currentUser.uid,
                patientName,
                bloodGroup,
                unitsRequired: parseInt(units) || 1,
                hospitalName: hospital,
                hospitalAddress: hospital, // Placeholder
                city,
                urgencyLevel: 'urgent',
                status: 'open',
                matchedDonorIds: [],
            };

            const requestId = await createDonationRequest(newRequest);
            console.log('Request posted successfully with ID:', requestId);
            
            setIsModalVisible(false);
            // Reset form
            setPatientName('');
            setBloodGroup('');
            setHospital('');
            setCity('');
            Alert.alert('Success', 'Blood request posted successfully');
        } catch (error) {
            console.error('Error posting request:', error);
            Alert.alert('Error', 'Failed to post request. Please check your connection.');
        } finally {
            setIsPosting(false);
        }
    };

    const renderRequestItem = ({ item }: { item: DonationRequest }) => {
        // Format date safely
        let timeString = 'Just now';
        if (item.createdAt && (item.createdAt as any).toDate) {
            const date = (item.createdAt as any).toDate();
            timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return (
            <View style={styles.requestCard}>
                <View style={[styles.bloodIndicator, { backgroundColor: item.urgencyLevel === 'urgent' ? Colors.error : Colors.primary }]}>
                    <Text style={styles.bloodText}>{item.bloodGroup}</Text>
                </View>
                
                <View style={styles.requestMainInfo}>
                    <Text style={styles.patientName}>{item.patientName}</Text>
                    <View style={styles.locationRow}>
                        <MaterialIcon name="location-on" size={14} color="#64748B" />
                        <Text style={styles.locationText}>{item.hospitalName}, {item.city}</Text>
                    </View>
                    <Text style={styles.timeLabel}>{timeString}</Text>
                </View>

                <View style={styles.unitsBadge}>
                    <Text style={styles.unitsText}>{item.unitsRequired} Unit</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Blood Requests</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
                    <MaterialIcon name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={requests}
                keyExtractor={(item) => item.id || Math.random().toString()}
                renderItem={renderRequestItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcon name="bloodtype" size={60} color="#E2E8F0" />
                        <Text style={styles.emptyTitle}>No Active Requests</Text>
                        <Text style={styles.emptySubtitle}>All caught up! Check back later or post a request.</Text>
                    </View>
                }
            />

            {/* Post Request Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Post Blood Request</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <MaterialIcon name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.inputLabel}>Patient Name</Text>
                            <TextInput style={styles.modalInput} placeholder="Enter name" value={patientName} onChangeText={setPatientName} />

                            <View style={styles.rowInputs}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.inputLabel}>Blood Group</Text>
                                    <TextInput style={styles.modalInput} placeholder="B+" value={bloodGroup} onChangeText={setBloodGroup} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.inputLabel}>Units Needed</Text>
                                    <TextInput style={styles.modalInput} placeholder="2" keyboardType="numeric" value={units} onChangeText={setUnits} />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Hospital Name</Text>
                            <TextInput style={styles.modalInput} placeholder="City Hospital" value={hospital} onChangeText={setHospital} />

                            <Text style={styles.inputLabel}>City</Text>
                            <TextInput style={styles.modalInput} placeholder="Islamabad" value={city} onChangeText={setCity} />

                            <TouchableOpacity 
                                style={[styles.submitButton, isPosting && { opacity: 0.7 }]} 
                                onPress={handleAddRequest}
                                disabled={isPosting}
                            >
                                {isPosting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Post Now</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
    addButton: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    listContent: { padding: 16 },
    requestCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: Colors.primary, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    bloodIndicator: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    bloodText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    requestMainInfo: { flex: 1, marginLeft: 16 },
    patientName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    locationText: { fontSize: 13, color: '#64748B', marginLeft: 4 },
    timeLabel: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
    unitsBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    unitsText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748B' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    modalForm: { flex: 1 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    modalInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', fontSize: 15 },
    rowInputs: { flexDirection: 'row' },
    submitButton: { backgroundColor: Colors.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    submitButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
});

export default BloodRequestFeedScreen;
