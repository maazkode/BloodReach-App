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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAuth } from '@react-native-firebase/auth';
import { createDonationRequest } from '../services/firestoreService';
import { DonationRequest } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRequest'>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CreateRequestScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    
    // Form State
    const [patientName, setPatientName] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [units, setUnits] = useState('1');
    const [hospital, setHospital] = useState('');
    const [city, setCity] = useState('');
    const [date, setDate] = useState(new Date());
    const [isEmergency, setIsEmergency] = useState(false);
    
    // UI Helpers
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const handleSubmit = async () => {
        if (!patientName || !bloodGroup || !hospital || !city) {
            Alert.alert('Missing Info', 'Please fill in all mandatory fields');
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
                hospitalAddress: hospital, // In a real app, this would be a full address
                city,
                urgencyLevel: isEmergency ? 'urgent' : 'normal',
                status: 'open',
                matchedDonorIds: [],
            };

            await createDonationRequest(requestData);
            Alert.alert(
                'Success', 
                'Your request has been posted to donors.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Submit Error:', error);
            Alert.alert('Error', 'Could not post request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-back" size={26} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Blood Request</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.formCard}>
                    {/* Patient Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Patient Name</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialIcon name="person-outline" size={22} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter patient name"
                                value={patientName}
                                onChangeText={setPatientName}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    {/* Blood Group & Units Row */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1.5, marginRight: 8 }]}>
                            <Text style={styles.label}>Blood Group</Text>
                            <TouchableOpacity
                                style={styles.dropdownPicker}
                                onPress={() => setShowBloodGroupPicker(!showBloodGroupPicker)}
                            >
                                <Text style={[styles.pickerText, !bloodGroup && { color: '#94A3B8' }]}>
                                    {bloodGroup || 'Select'}
                                </Text>
                                <MaterialCommunityIcon name="unfold-more-horizontal" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                            {showBloodGroupPicker && (
                                <View style={styles.bloodGroupDropdown}>
                                    {BLOOD_GROUPS.map((group) => (
                                        <TouchableOpacity
                                            key={group}
                                            style={styles.bloodGroupItem}
                                            onPress={() => { setBloodGroup(group); setShowBloodGroupPicker(false); }}
                                        >
                                            <Text style={styles.bloodGroupText}>{group}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Units</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2"
                                    keyboardType="numeric"
                                    value={units}
                                    onChangeText={setUnits}
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Hospital Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Hospital Name</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcon name="home-plus-outline" size={22} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter hospital name"
                                value={hospital}
                                onChangeText={setHospital}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    {/* City */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>City / Location</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialIcon name="location-on" size={22} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Islamabad"
                                value={city}
                                onChangeText={setCity}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    {/* Required Date */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Required Date</Text>
                        <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowDatePicker(true)}>
                            <MaterialCommunityIcon name="calendar-range" size={22} color="#94A3B8" style={styles.inputIcon} />
                            <Text style={styles.pickerText}>
                                {date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                            </Text>
                            <View style={{ flex: 1 }} />
                            <MaterialCommunityIcon name="calendar-edit" size={22} color="#1E293B" />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
                        )}
                    </View>

                    {/* Emergency Toggle Design from Image */}
                    <View style={styles.emergencyContainer}>
                        <View style={styles.warningIconBox}>
                            <MaterialIcon name="report-problem" size={24} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: 12 }}>
                            <Text style={styles.emergencyLabel}>Emergency Request</Text>
                            <Text style={styles.emergencySubtext}>Mark as high priority for faster matching</Text>
                        </View>
                        <Switch
                            value={isEmergency}
                            onValueChange={setIsEmergency}
                            trackColor={{ false: '#E2E8F0', true: '#DC2626' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Agreement Text */}
                <Text style={styles.agreementText}>
                    BY SUBMITTING, YOU AGREE TO BLOODREACH'S TERMS AND PRIVACY POLICY REGARDING EMERGENCY MEDICAL REQUESTS.
                </Text>

                {/* Submit Button */}
                <TouchableOpacity 
                    style={[styles.submitButton, loading && { opacity: 0.8 }]} 
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={styles.submitButtonText}>Submit Request</Text>
                            <MaterialIcon name="send" size={22} color="white" style={{ marginLeft: 10 }} />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
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
        paddingBottom: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
    formCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        paddingVertical: 10,
        marginBottom: 10,
    },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10 },
    dropdownPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        height: 58,
        paddingHorizontal: 16,
    },
    pickerText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
    bloodGroupDropdown: {
        marginTop: 8,
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        elevation: 4,
        zIndex: 100,
    },
    bloodGroupItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    bloodGroupText: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        borderRadius: 16,
        height: 58,
        paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '500' },
    row: { flexDirection: 'row' },
    emergencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        borderRadius: 20,
        padding: 16,
        marginTop: 10,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    warningIconBox: { width: 44, height: 44, backgroundColor: '#FEF2F2', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    emergencyLabel: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    emergencySubtext: { fontSize: 12, color: '#64748B', marginTop: 2 },
    agreementText: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 25,
        marginVertical: 35,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    submitButton: {
        backgroundColor: '#DC2626',
        borderRadius: 20,
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    submitButtonText: { color: 'white', fontSize: 18, fontWeight: '800' },
});

export default CreateRequestScreen;
