import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Alert,
    Switch,
    ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getAuth } from '@react-native-firebase/auth';
import { createUserDocument } from '../services/firestoreService';
import { UserDocument } from '../types/database';
import { Timestamp, serverTimestamp } from '@react-native-firebase/firestore';
import { getFullLocationData, forwardGeocode, LocationData } from '../services/locationService';
import { getFCMToken } from '../services/notificationService';
import { geohashForLocation } from 'geofire-common';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

type Props = NativeStackScreenProps<RootStackParamList, 'UnifiedRegistration'>;

const UnifiedRegistrationScreen: React.FC<Props> = ({ navigation }) => {
    // Required Fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [address, setAddress] = useState('');
    const [manualAddress, setManualAddress] = useState('');

    // Optional Fields
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [lastDonationDate, setLastDonationDate] = useState<Date | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    // UI Helpers
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isBloodGroupModalVisible, setIsBloodGroupModalVisible] = useState(false);
    const [isGenderModalVisible, setIsGenderModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);

    const validateForm = () => {
        let tempErrors: { [key: string]: string } = {};
        if (!name.trim()) tempErrors.name = 'Full name is required';
        if (!phone.trim()) tempErrors.phone = 'Phone number is required';
        if (!bloodGroup) tempErrors.bloodGroup = 'Blood group is required';
        if (!address.trim()) tempErrors.address = 'Full address is required';

        setErrors(tempErrors);
        if (!locationData) {
            Alert.alert('Location Required', 'Please detect your location or enter it manually to proceed.');
            return false;
        }
        return Object.keys(tempErrors).length === 0;
    };

    const handleFetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const data = await getFullLocationData();
            setLocationData(data);
            if (data.address) {
                setAddress(data.address);
            }
        } catch (error: any) {
            Alert.alert('Detection Failed', error.message || 'Could not detect location');
        } finally {
            setFetchingLocation(false);
        }
    };

    const handleAutoDetect = handleFetchLocation;

    const handleManualLocate = async () => {
        if (!address.trim()) {
            Alert.alert('Error', 'Please enter an address or city name');
            return;
        }

        setIsDetecting(true);
        try {
            const result = await forwardGeocode(manualAddress);
            if (result) {
                const hash = geohashForLocation([result.latitude, result.longitude]);
                setLocationData({
                    latitude: result.latitude,
                    longitude: result.longitude,
                    geohash: hash,
                    address: result.address
                });
                setAddress(result.address);
            } else {
                Alert.alert('Not Found', 'Could not find coordinates for this address.');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong while locating.');
        } finally {
            setIsDetecting(false);
        }
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const currentUser = getAuth().currentUser;
            if (!currentUser) throw new Error('No authenticated user found');
            if (!locationData) throw new Error('Location data missing');

            const roles = isAvailable ? ['donor', 'requester'] : ['requester'];
            const lastActiveRole = isAvailable ? 'donor' : 'requester';

            // 90-day eligibility check
            let isEligible = true;
            let cooldownUntil: Timestamp | null = null;
            if (lastDonationDate) {
                const now = new Date();
                const cooldownDate = new Date(lastDonationDate);
                cooldownDate.setDate(cooldownDate.getDate() + 90);
                
                console.log('[Registration] Last Donation:', lastDonationDate.toDateString());
                console.log('[Registration] Cooldown Until:', cooldownDate.toDateString());
                console.log('[Registration] Today:', now.toDateString());

                if (now < cooldownDate) {
                    isEligible = false;
                    cooldownUntil = Timestamp.fromDate(cooldownDate);
                    console.log('[Registration] Donor is INELIGIBLE');
                } else {
                    console.log('[Registration] Donor is ELIGIBLE');
                }
            }

            const userData: UserDocument = {
                uid: currentUser.uid,
                name,
                phone,
                bloodGroup,
                city: address.split(',')[0].trim(), // Extract first part as city for compatibility
                address: address,
                age: age ? Number(age) : undefined,
                gender: gender || undefined,
                isAvailable: isEligible ? isAvailable : false, // Force false if ineligible
                isEligibleToDonate: isEligible,
                donationCooldownUntil: cooldownUntil,
                roles: roles,
                lastActiveRole: lastActiveRole as 'donor' | 'requester',
                lastDonationDate: lastDonationDate ? Timestamp.fromDate(lastDonationDate) : null,
                fcmToken: (await getFCMToken()) || undefined,

                // locationData.address might be more precise if geocoded
                location: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    geohash: locationData.geohash,
                },

                // System / Placeholders for removed fields
                email: currentUser.email || '',
                photoURL: currentUser.photoURL || '',
                isVerified: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await createUserDocument(userData);
            navigation.replace(roles.includes('donor') ? 'DonorDashboard' : 'RequesterDashboard');
        } catch (error: any) {
            console.error('Registration Error:', error);
            Alert.alert('Registration Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile Setup</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.brandingSection}>
                        <Text style={styles.mainTitle}>Join the Community</Text>
                        <Text style={styles.subtitle}>Enter details to save lives or request help.</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Required Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                            <TextInput style={styles.input} placeholder="John Doe" value={name} onChangeText={setName} />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
                            <TextInput style={styles.input} placeholder="+92XXXXXXXXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Blood Group <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.inputWrapper}
                                onPress={() => setIsBloodGroupModalVisible(true)}
                            >
                                <Text style={{ color: bloodGroup ? '#1E293B' : '#94A3B8' }}>
                                    {bloodGroup || "Select blood type"}
                                </Text>
                                <MaterialIcon name="bloodtype" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                            {errors.bloodGroup && <Text style={styles.errorText}>{errors.bloodGroup}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Address <Text style={styles.required}>*</Text></Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 0 }]}
                                    placeholder="House, Street, City"
                                    value={address}
                                    onChangeText={(text) => {
                                        setAddress(text);
                                        if (locationData) setLocationData(null);
                                    }}
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
                            {locationData && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                    <MaterialIcon name="check-circle" size={14} color="#10B981" />
                                    <Text style={{ fontSize: 11, color: '#10B981', marginLeft: 4, fontWeight: '600' }}>Location Verified</Text>
                                </View>
                            )}
                            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                        </View>



                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Age</Text>
                                <TextInput style={styles.input} placeholder="25" keyboardType="numeric" value={age} onChangeText={setAge} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Gender</Text>
                                <TouchableOpacity
                                    style={styles.inputWrapper}
                                    onPress={() => setIsGenderModalVisible(true)}
                                >
                                    <Text style={{ color: gender ? '#1E293B' : '#94A3B8' }}>
                                        {gender || "Select"}
                                    </Text>
                                    <MaterialIcon name="person" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Last Donation Date</Text>
                            <TouchableOpacity
                                style={styles.inputWrapper}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: lastDonationDate ? '#1E293B' : '#94A3B8' }}>
                                    {lastDonationDate ? lastDonationDate.toDateString() : "Never / Not sure"}
                                </Text>
                                <MaterialIcon name="calendar-today" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.donorSection}>
                            <View style={styles.donorInfo}>
                                <Text style={styles.donorTitle}>Wants to Donate Blood?</Text>
                                <Text style={styles.donorSubtitle}>Turn this on to show up as a donor for people in need.</Text>
                            </View>
                            <Switch
                                value={isAvailable}
                                onValueChange={setIsAvailable}
                                trackColor={{ false: '#CBD5E1', true: '#FEE2E2' }}
                                thumbColor={isAvailable ? Colors.primary : '#F4F4F5'}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.registerButton, loading && { opacity: 0.7 }]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.registerButtonText}>
                                {loading ? 'Saving Profile...' : 'Complete Profile'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </ScrollView>

            {/* Blood Group Modal */}
            <Modal visible={isBloodGroupModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Blood Group</Text>
                        <View style={styles.bloodGrid}>
                            {BLOOD_GROUPS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.bloodItem, bloodGroup === item && styles.bloodItemSelected]}
                                    onPress={() => { setBloodGroup(item); setIsBloodGroupModalVisible(false); }}
                                >
                                    <Text style={[styles.bloodItemText, bloodGroup === item && styles.bloodItemTextSelected]}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsBloodGroupModalVisible(false)}>
                            <Text style={styles.modalCloseButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Gender Modal */}
            <Modal visible={isGenderModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Gender</Text>
                        {GENDERS.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={styles.selectionItem}
                                onPress={() => { setGender(item); setIsGenderModalVisible(false); }}
                            >
                                <Text style={styles.selectionItemText}>{item}</Text>
                                {gender === item && <MaterialIcon name="check" size={20} color={Colors.primary} />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsGenderModalVisible(false)}>
                            <Text style={styles.modalCloseButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {showDatePicker && (
                <DateTimePicker
                    value={lastDonationDate || new Date()}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setLastDonationDate(selectedDate);
                    }}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
    backButton: { position: 'absolute', left: 16 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    brandingSection: { alignItems: 'center', marginVertical: 30 },
    logoContainer: { width: 60, height: 60, backgroundColor: '#FEE2E2', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
    required: { color: Colors.primary },
    input: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1E293B' },
    inputWrapper: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 16, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row' },
    separator: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
    donorSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
    donorInfo: { flex: 0.8 },
    donorTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    donorSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
    registerButton: { backgroundColor: Colors.primary, height: 54, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    registerButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
    errorText: { color: Colors.error, fontSize: 11, marginTop: 4 },

    // Location Styles
    locationSection: { marginVertical: 10 },
    locationActions: { marginTop: 10 },
    detectButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 12,
        shadowColor: Colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3
    },
    detectButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
    manualInputRow: { flexDirection: 'row', alignItems: 'center' },
    locateButton: {
        backgroundColor: Colors.primary,
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8
    },
    toggleModeButton: { marginTop: 12, alignItems: 'center' },
    toggleModeText: { color: '#64748B', fontSize: 13, textDecorationLine: 'underline' },
    capturedLocation: {
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#BBF7D0'
    },
    locationInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    locationTextContainer: { marginLeft: 10, flex: 1 },
    locationFoundTitle: { fontSize: 13, fontWeight: 'bold', color: '#065F46' },
    capturedAddress: { fontSize: 12, color: '#047857', marginTop: 2 },
    retryLocation: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#DCFCE7', borderRadius: 8 },
    retryText: { fontSize: 12, fontWeight: 'bold', color: '#059669' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
    bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    bloodItem: { width: '23%', aspectRatio: 1, backgroundColor: '#F1F5F9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    bloodItemSelected: { backgroundColor: Colors.primary },
    bloodItemText: { fontSize: 16, fontWeight: '700', color: '#475569' },
    bloodItemTextSelected: { color: 'white' },
    selectionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    selectionItemText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
    modalCloseButton: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
    modalCloseButtonText: { color: '#64748B', fontWeight: '600' },

    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    locationButtonText: {
        color: '#B62022',
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 6,
    },
});

export default UnifiedRegistrationScreen;
