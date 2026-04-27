import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
    StatusBar,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth';

import { RootStackParamList } from '../../App';
import { createDonationRequest } from '../services/firestoreService';
import { DonationRequest } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRequest'>;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CreateRequestScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const [patientName, setPatientName] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [units, setUnits] = useState('1');
    const [hospital, setHospital] = useState('');
    const [city, setCity] = useState('');
    const [date, setDate] = useState(new Date());
    const [isEmergency, setIsEmergency] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const onDateChange = (_: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const handleSubmit = async () => {
        if (!patientName || !bloodGroup || !hospital || !city) {
            Alert.alert('Missing Info', 'Please fill all required fields');
            return;
        }

        const currentUser = getAuth().currentUser;
        if (!currentUser) return;

        setLoading(true);
        try {
            const requestData: Omit<DonationRequest, 'id' | 'createdAt' | 'updatedAt'> = {
                requesterId: currentUser.uid,
                patientName,
                bloodGroup,
                unitsRequired: parseInt(units) || 1,
                hospitalName: hospital,
                hospitalAddress: hospital,
                city,
                urgencyLevel: isEmergency ? 'urgent' : 'normal',
                status: 'open',
                matchedDonorIds: [],
            };

            await createDonationRequest(requestData);

            Alert.alert('Success', 'Request submitted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            Alert.alert('Error', 'Could not submit request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Blood Request</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1.3, marginRight: 8 }]}>
                        <Text style={styles.label}>Blood Group</Text>
                        <TouchableOpacity
                            style={styles.inputBox}
                            onPress={() => setShowBloodGroupPicker(true)}
                        >
                            <Text style={styles.valueText}>
                                {bloodGroup || 'Select'}
                            </Text>
                            <MaterialCommunityIcon
                                name="chevron-down"
                                size={22}
                                color="#64748B"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Units</Text>
                        <View style={styles.inputBox}>
                            <TextInput
                                value={units}
                                onChangeText={setUnits}
                                keyboardType="numeric"
                                placeholder="1"
                                style={styles.input}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.emergencyCard}>
                    <View style={styles.warningBox}>
                        <MaterialIcon name="report-problem" size={20} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.emergencyTitle}>Emergency Request</Text>
                        <Text style={styles.emergencySub}>High priority matching</Text>
                    </View>
                    <Switch value={isEmergency} onValueChange={setIsEmergency} />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Patient Name</Text>
                    <View style={styles.inputBox}>
                        <TextInput
                            value={patientName}
                            onChangeText={setPatientName}
                            placeholder="Enter patient name"
                            style={styles.input}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Hospital Name</Text>
                    <View style={styles.inputBox}>
                        <TextInput
                            value={hospital}
                            onChangeText={setHospital}
                            placeholder="Enter hospital name"
                            style={styles.input}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>City</Text>
                    <View style={styles.inputBox}>
                        <TextInput
                            value={city}
                            onChangeText={setCity}
                            placeholder="e.g. Islamabad"
                            style={styles.input}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Required Date</Text>
                    <TouchableOpacity
                        style={styles.inputBox}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.valueText}>
                            {date.toLocaleDateString()}
                        </Text>
                        <MaterialCommunityIcon
                            name="calendar-month"
                            size={22}
                            color="#64748B"
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.agreementText}>
                    By continuing, you agree to Terms & Privacy Policy
                </Text>
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>Submit Request</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Modal visible={showBloodGroupPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Blood Group</Text>
                        {BLOOD_GROUPS.map(item => (
                            <TouchableOpacity
                                key={item}
                                style={styles.modalItem}
                                onPress={() => {
                                    setBloodGroup(item);
                                    setShowBloodGroupPicker(false);
                                }}
                            >
                                <Text style={styles.modalItemText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={onDateChange}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120,
    },
    row: { flexDirection: 'row' },
    inputGroup: { marginBottom: 14 },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        color: '#475569',
    },
    inputBox: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
    },
    valueText: {
        fontSize: 14,
        color: '#1E293B',
    },
    emergencyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 16,
        padding: 12,
        marginBottom: 14,
    },
    warningBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emergencyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    emergencySub: {
        fontSize: 12,
        color: '#64748B',
    },
    agreementText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 8,
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    submitButton: {
        height: 54,
        borderRadius: 16,
        backgroundColor: '#DC2626',
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 14,
        textAlign: 'center',
    },
    modalItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalItemText: {
        fontSize: 15,
        textAlign: 'center',
        color: '#1E293B',
    },
});

export default CreateRequestScreen;