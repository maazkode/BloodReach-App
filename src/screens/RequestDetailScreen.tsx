import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { db } from '../services/firestoreService';
import { DonationRequest } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetail'>;

const RequestDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { requestId } = route.params;
    const [request, setRequest] = useState<DonationRequest | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const docRef = doc(db, 'requests', requestId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setRequest({ id: docSnap.id, ...docSnap.data() } as DonationRequest);
                } else {
                    Alert.alert('Error', 'Request not found.');
                    navigation.goBack();
                }
            } catch (error) {
                console.error('Error fetching request:', error);
                Alert.alert('Error', 'Failed to load request details.');
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();
    }, [requestId]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!request) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Request Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.urgencyBadge}>
                    <Text style={styles.urgencyText}>{request.urgencyLevel.toUpperCase()} REQUEST</Text>
                </View>

                <View style={styles.bloodCard}>
                    <View style={styles.bloodCircle}>
                        <Text style={styles.bloodGroupText}>{request.bloodGroup}</Text>
                    </View>
                    <View style={styles.patientInfo}>
                        <Text style={styles.patientName}>{request.patientName}</Text>
                        <Text style={styles.unitsNeeded}>{request.unitsRequired} Units Required</Text>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <View style={styles.iconContainer}>
                            <MaterialIcon name="local-hospital" size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Hospital</Text>
                            <Text style={styles.infoValue}>{request.hospitalName}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.iconContainer}>
                            <MaterialIcon name="location-on" size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Location</Text>
                            <Text style={styles.infoValue}>{request.hospitalAddress}</Text>
                            <Text style={styles.infoValue}>{request.city}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => Alert.alert('Interested', 'This feature will notify the requester that you want to help.')}
                >
                    <Text style={styles.actionButtonText}>I Can Donate</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
    backButton: { position: 'absolute', left: 16 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    scrollContent: { padding: 20 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    urgencyBadge: { alignSelf: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
    urgencyText: { color: Colors.error, fontSize: 12, fontWeight: '700' },
    bloodCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    bloodCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    bloodGroupText: { color: 'white', fontSize: 24, fontWeight: '900' },
    patientInfo: { marginLeft: 20 },
    patientName: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    unitsNeeded: { fontSize: 14, color: '#64748B', marginTop: 4 },
    infoSection: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 30 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    infoTextContainer: { marginLeft: 16, flex: 1 },
    infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
    infoValue: { fontSize: 16, color: '#1E293B', fontWeight: '600', marginTop: 2 },
    actionButton: { backgroundColor: Colors.primary, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    actionButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
});

export default RequestDetailScreen;
