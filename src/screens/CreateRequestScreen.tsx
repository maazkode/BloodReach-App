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
    KeyboardAvoidingView,
    Platform,
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
import { getFullLocationData } from '../services/locationService';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRequest'>;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CreateRequestScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const [patientName, setPatientName] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [units, setUnits] = useState('1');
    const [hospital, setHospital] = useState('');
    const [address, setAddress] = useState('');
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [date, setDate] = useState(new Date());
    const [isEmergency, setIsEmergency] = useState(false);
    const [phone, setPhone] = useState('');
    const [coordinates, setCoordinates] = useState<{ latitude: number, longitude: number, geohash: string } | null>(null);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const onDateChange = (_: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };



    const handleFetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const locationData = await getFullLocationData();
            setAddress(locationData.address);
            setCoordinates({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                geohash: locationData.geohash
            });
        } catch (error: any) {
            Alert.alert('Location Error', error.message || 'Could not fetch location');
        } finally {
            setFetchingLocation(false);
        }
    };

    const handleSubmit = async () => {
        if (!patientName || !phone || !bloodGroup || !hospital || !address) {
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
                phone,
                bloodGroup,
                unitsRequired: parseInt(units) || 1,
                hospitalName: hospital,
                hospitalAddress: hospital,
                city: address,
                location: coordinates || { latitude: 0, longitude: 0, geohash: '' },
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

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.mainContent}
                >
                {/* BLOOD GROUP + DROPDOWN FIX */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1.3, marginRight: 8 }]}>
                        <Text style={styles.label}>Blood Group</Text>

                        <TouchableOpacity
                            style={styles.inputBox}
                            onPress={() => setShowBloodGroupPicker(!showBloodGroupPicker)}
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

                        {/* SMALL DROPDOWN */}
                        {showBloodGroupPicker && (
                            <View style={styles.dropdown}>
                                {BLOOD_GROUPS.map(item => (
                                    <TouchableOpacity
                                        key={item}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setBloodGroup(item);
                                            setShowBloodGroupPicker(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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
                        <MaterialIcon name="report-problem" size={20} color="#B62022" />
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
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={styles.inputBox}>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="03xx xxxxxxx"
                            keyboardType="phone-pad"
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
                    <Text style={styles.label}>Address</Text>
                    <View style={styles.inputBox}>
                        <TextInput
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Enter full address or fetch live"
                            style={styles.input}
                            placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity 
                            onPress={handleFetchLocation} 
                            disabled={fetchingLocation}
                            activeOpacity={0.7}
                            style={styles.locationButton}
                        >
                            {fetchingLocation ? (
                                <ActivityIndicator size="small" color="#B62022" />
                            ) : (
                                <>
                                    <MaterialIcon name="my-location" size={16} color="#B62022" />
                                    <Text style={styles.locationButtonText}>Fetch</Text>
                                </>
                            )}
                        </TouchableOpacity>
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


                <View style={{ marginTop: 20 }}>
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
                </ScrollView>
            </KeyboardAvoidingView>

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

    mainContent: {
        flexGrow: 1,
        padding: 20,
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
        height: 45,
        borderRadius: 10,
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

    locationButton: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 12,
        height: 34,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    locationButtonText: {
        color: '#B62022',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
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



    submitButton: {
        height: 50,
        borderRadius: 10,
        backgroundColor: '#B62022',
        justifyContent: 'center',
        alignItems: 'center',
    },

    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    dropdown: {
        position: 'absolute',
        top: 75,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        zIndex: 999,
        elevation: 5,
    },

    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },

    dropdownText: {
        fontSize: 14,
        color: '#1E293B',
    },
});

export default CreateRequestScreen;
