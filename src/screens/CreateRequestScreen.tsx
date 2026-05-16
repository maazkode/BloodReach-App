import React, { useState, useEffect } from 'react';
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
import { safeRun, log } from '../utility/errorHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth';

import { RootStackParamList } from '../navigation/AppNavigator';
import { createDonationRequest } from '../api/firestoreService';
import { DonationRequest } from '../types/database';
import { getFullLocationData, forwardGeocode } from '../api/locationService';
import { geohashForLocation } from 'geofire-common';
import { useModal } from '../context/ModalContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRequest'>;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CreateRequestScreen: React.FC<Props> = ({ navigation }) => {
    const { showModal } = useModal();
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
    const [lastGeocodedAddress, setLastGeocodedAddress] = useState('');
    const [isLocationVerified, setIsLocationVerified] = useState(false);
    
    // New states for inline verification
    const [isDetecting, setIsDetecting] = useState(false);
    const [hasGeocodeFailed, setHasGeocodeFailed] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const onDateChange = (_: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };



    const handleFetchLocation = async () => {
        if (fetchingLocation) return; // prevent double-tap
        setFetchingLocation(true);
        setHasGeocodeFailed(false);
        await safeRun(
            async () => {
                if (address && address.length > 3 && address !== lastGeocodedAddress) {
                    log('info', 'CreateRequest > handleFetchLocation', 'Verifying manual address', { address });
                    const geoResult = await forwardGeocode(address);
                    if (geoResult) {
                        setCoordinates({
                            latitude: geoResult.latitude,
                            longitude: geoResult.longitude,
                            geohash: geohashForLocation([geoResult.latitude, geoResult.longitude]),
                        });
                        setAddress(geoResult.address);
                        setLastGeocodedAddress(geoResult.address);
                        setIsLocationVerified(true);
                        showModal({
                            title: 'Location Verified ✓',
                            description: 'Your hospital location has been confirmed.',
                            type: 'success',
                            primaryText: 'OK'
                        });
                    } else {
                        setIsLocationVerified(false);
                        setHasGeocodeFailed(true);
                        showModal({
                            title: 'Location Not Found',
                            description: 'Could not find coordinates for this address. Please try a more specific address or use GPS.',
                            type: 'error',
                            primaryText: 'Retry'
                        });
                    }
                } else {
                    log('info', 'CreateRequest > handleFetchLocation', 'Fetching GPS location');
                    const locationData = await getFullLocationData();
                    setAddress(locationData.address);
                    setCoordinates({
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        geohash: locationData.geohash,
                    });
                    setLastGeocodedAddress(locationData.address);
                    setIsLocationVerified(true);
                }
            },
            {
                context: 'CreateRequest > handleFetchLocation',
                errorTitle: 'Location Error',
                allowRetry: true,
                showModal,
                onError: () => setIsLocationVerified(false),
            }
        );
        setFetchingLocation(false);
    };

    // Debounced manual location lookup
    useEffect(() => {
        if (!address.trim()) {
            setHasGeocodeFailed(false);
            return;
        }
        if (address === lastGeocodedAddress) return;

        let isCancelled = false;
        setHasGeocodeFailed(false);

        const delayDebounceFn = setTimeout(async () => {
            setIsDetecting(true);
            try {
                const geoResult = await forwardGeocode(address);
                if (!isCancelled) {
                    if (geoResult) {
                        setCoordinates({
                            latitude: geoResult.latitude,
                            longitude: geoResult.longitude,
                            geohash: geohashForLocation([geoResult.latitude, geoResult.longitude]),
                        });
                        setLastGeocodedAddress(geoResult.address);
                        setIsLocationVerified(true);
                        setHasGeocodeFailed(false);
                    } else {
                        setCoordinates(null);
                        setIsLocationVerified(false);
                        setHasGeocodeFailed(true);
                    }
                }
            } catch (error) {
                if (!isCancelled) {
                    setCoordinates(null);
                    setIsLocationVerified(false);
                    setHasGeocodeFailed(true);
                }
            } finally {
                if (!isCancelled) setIsDetecting(false);
            }
        }, 1500);

        return () => {
            isCancelled = true;
            clearTimeout(delayDebounceFn);
        };
    }, [address, lastGeocodedAddress]);

    const validateForm = () => {
        let tempErrors: { [key: string]: string } = {};
        if (!bloodGroup) tempErrors.bloodGroup = 'Blood group is required';
        if (!units.trim()) tempErrors.units = 'Required';
        if (!patientName.trim()) tempErrors.patientName = 'Patient name is required';
        if (!phone.trim()) {
            tempErrors.phone = 'Mobile number is required';
        } else if (!/^(?:\+92|03)\d{9}$/.test(phone.trim())) {
            tempErrors.phone = 'Format: +923001234567 or 03001234567';
        }
        if (!hospital.trim()) tempErrors.hospital = 'Hospital name is required';
        if (!address.trim()) tempErrors.address = 'Address is required';
        
        if (!isLocationVerified || !coordinates || address !== lastGeocodedAddress) {
            tempErrors.location = 'Location verification is required (use Locate)';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async () => {
        // Validation
        if (!validateForm()) return;

        const currentUser = getAuth().currentUser;
        if (!currentUser) {
            showModal({
                title: 'Session Expired',
                description: 'Please sign in again to continue.',
                type: 'error',
                primaryText: 'Sign In',
                onPrimaryPress: () => navigation.replace('Auth')
            });
            return;
        }

        if (loading) return; // prevent double-submit

        setLoading(true);
        await safeRun(
            async () => {
                const requestData: Omit<DonationRequest, 'id' | 'createdAt' | 'updatedAt'> = {
                    requesterId: currentUser.uid,
                    patientName: patientName.trim(),
                    phone: phone.trim(),
                    bloodGroup,
                    unitsRequired: parseInt(units) || 1,
                    hospitalName: hospital.trim(),
                    hospitalAddress: hospital.trim(),
                    city: address,
                    location: coordinates!,
                    urgencyLevel: isEmergency ? 'urgent' : 'normal',
                    status: 'open',
                    matchedDonorIds: [],
                };
                log('info', 'CreateRequest > handleSubmit', 'Submitting blood request', { bloodGroup, urgency: requestData.urgencyLevel });
                await createDonationRequest(requestData);
            },
            {
                context: 'CreateRequest > handleSubmit',
                errorTitle: 'Submission Failed',
                allowRetry: true,
                showModal,
                onSuccess: () =>
                    showModal({
                        title: 'Request Submitted ✓',
                        description: 'Your blood request is now live. Nearby donors will be notified.',
                        type: 'success',
                        primaryText: 'Done',
                        onPrimaryPress: () => navigation.goBack()
                    }),
            }
        );
        setLoading(false);
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
                            <Text style={styles.label}>Blood Group <Text style={styles.required}>*</Text></Text>

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
                            {errors.bloodGroup && <Text style={styles.errorText}>{errors.bloodGroup}</Text>}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Units <Text style={styles.required}>*</Text></Text>
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
                            {errors.units && <Text style={styles.errorText}>{errors.units}</Text>}
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
                        <Text style={styles.label}>Patient Name <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputBox}>
                            <TextInput
                                value={patientName}
                                onChangeText={setPatientName}
                                placeholder="Enter patient name"
                                style={styles.input}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                        {errors.patientName && <Text style={styles.errorText}>{errors.patientName}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
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
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Hospital Name <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputBox}>
                            <TextInput
                                value={hospital}
                                onChangeText={setHospital}
                                placeholder="Enter hospital name"
                                style={styles.input}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                        {errors.hospital && <Text style={styles.errorText}>{errors.hospital}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputBox}>
                            <TextInput
                                value={address}
                                onChangeText={(text) => {
                                    setAddress(text);
                                    if (isLocationVerified) setIsLocationVerified(false);
                                    if (hasGeocodeFailed) setHasGeocodeFailed(false);
                                }}
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
                                        <MaterialIcon 
                                            name={isLocationVerified && address === lastGeocodedAddress ? "check-circle" : "location-searching"} 
                                            size={16} 
                                            color={isLocationVerified && address === lastGeocodedAddress ? "#16A34A" : "#B62022"} 
                                        />
                                        <Text style={[
                                            styles.locationButtonText,
                                            isLocationVerified && address === lastGeocodedAddress && { color: '#16A34A' }
                                        ]}>
                                            {isLocationVerified && address === lastGeocodedAddress ? "Verified" : "Locate"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        {isDetecting ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                <ActivityIndicator size="small" color="#94A3B8" />
                                <Text style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4, fontWeight: '500' }}>Verifying address...</Text>
                            </View>
                        ) : isLocationVerified && address === lastGeocodedAddress ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                <MaterialIcon name="check-circle" size={14} color="#10B981" />
                                <Text style={{ fontSize: 11, color: '#10B981', marginLeft: 4, fontWeight: '600' }}>Location Verified</Text>
                            </View>
                        ) : hasGeocodeFailed && address.length > 3 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                <MaterialIcon name="error" size={14} color="#F59E0B" />
                                <Text style={{ fontSize: 11, color: '#F59E0B', marginLeft: 4, fontWeight: '600' }}>Location unverified. Keep typing or use Fetch.</Text>
                            </View>
                        ) : null}
                        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                        {errors.location && !errors.address && <Text style={styles.errorText}>{errors.location}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Required Date <Text style={styles.required}>*</Text></Text>
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

    required: {
        color: '#B62022',
    },

    errorText: {
        color: '#B62022',
        fontSize: 11,
        marginTop: 4,
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


