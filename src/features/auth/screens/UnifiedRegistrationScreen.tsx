import React, { useState, useEffect } from 'react';
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
    BackHandler,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../shared/theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { getAuth } from '@react-native-firebase/auth';
import { createUserDocument } from '../../shared/services/firestoreService';
import { UserDocument } from '../../shared/types/database';
import { Timestamp, serverTimestamp } from '@react-native-firebase/firestore';
import { getFullLocationData, forwardGeocode, LocationData } from '../../shared/services/locationService';
import { getFCMToken } from '../../shared/services/notificationService';
import { geohashForLocation } from 'geofire-common';
import { signOut } from '../services/authService';
import { useModal } from '../../shared/context/ModalContext';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

type Props = NativeStackScreenProps<RootStackParamList, 'UnifiedRegistration'>;

const UnifiedRegistrationScreen: React.FC<Props> = ({ navigation }) => {
    const { showModal } = useModal();
    // Required Fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [address, setAddress] = useState('');


    // Optional Fields
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [lastDonationDate, setLastDonationDate] = useState<Date | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    // UI Helpers
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        const backAction = () => {
            showModal({
                title: 'Exit Registration?',
                description: "Going back will sign you out. You'll need to complete this setup next time you log in.",
                type: 'warning',
                primaryText: 'Sign Out',
                onPrimaryPress: async () => {
                    try {
                        await signOut();
                    } catch (error) {
                        navigation.replace('Auth');
                    }
                },
                secondaryText: 'Stay',
            });
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction,
        );

        return () => backHandler.remove();
    }, [navigation, showModal]);

    const handleDateChange = React.useCallback((event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setLastDonationDate(selectedDate);
    }, []);

    const validateForm = React.useCallback(() => {
        let tempErrors: { [key: string]: string } = {};
        if (!name.trim()) tempErrors.name = 'Full name is required';
        if (!phone.trim()) tempErrors.phone = 'Phone number is required';
        if (!bloodGroup) tempErrors.bloodGroup = 'Blood group is required';
        if (!address.trim()) tempErrors.address = 'Full address is required';

        setErrors(tempErrors);
        if (!locationData) {
            showModal({
                title: 'Location Required',
                description: 'Please detect your location using the Fetch button, or ensure your typed address is fully typed and verified.',
                type: 'warning',
                primaryText: 'Got it'
            });
            return false;
        }
        return Object.keys(tempErrors).length === 0;
    }, [name, phone, bloodGroup, address, locationData, showModal]);

    const handleFetchLocation = React.useCallback(async () => {
        setFetchingLocation(true);
        try {
            const data = await getFullLocationData();
            setLocationData(data);
            if (data.address) {
                setAddress(data.address);
            }
        } catch (error: any) {
            showModal({
                title: 'Detection Failed',
                description: error.message || 'Could not detect location. Please type your address manually.',
                type: 'error',
                primaryText: 'OK'
            });
        } finally {
            setFetchingLocation(false);
        }
    }, [showModal]);

    // Debounced manual location lookup
    useEffect(() => {
        if (!address.trim() || locationData?.address === address) return;

        const delayDebounceFn = setTimeout(async () => {
            setIsDetecting(true);
            try {
                const result = await forwardGeocode(address);
                if (result) {
                    const hash = geohashForLocation([result.latitude, result.longitude]);
                    setLocationData({
                        latitude: result.latitude,
                        longitude: result.longitude,
                        geohash: hash,
                        address: result.address
                    });
                    // We don't overwrite address here so the user can continue typing
                } else {
                    setLocationData(null);
                }
            } catch (error) {
                setLocationData(null);
            } finally {
                setIsDetecting(false);
            }
        }, 1500);

        return () => clearTimeout(delayDebounceFn);
    }, [address]);

    const handleRegister = React.useCallback(async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const currentUser = getAuth().currentUser;
            if (!currentUser) throw new Error('No authenticated user found');
            if (!locationData) throw new Error('Location data missing');

            const roles = isAvailable ? ['donor', 'requester'] : ['requester'];
            const lastActiveRole = isAvailable ? 'donor' : 'requester';

            let isEligible = true;
            let cooldownUntil: Timestamp | null = null;
            if (lastDonationDate) {
                const now = new Date();
                const cooldownDate = new Date(lastDonationDate);
                cooldownDate.setDate(cooldownDate.getDate() + 90);

                if (now < cooldownDate) {
                    isEligible = false;
                    cooldownUntil = Timestamp.fromDate(cooldownDate);
                }
            }

            const userData: UserDocument = {
                uid: currentUser.uid,
                name,
                phone,
                bloodGroup,
                city: address.split(',')[0].trim(),
                address: address,
                age: age ? Number(age) : undefined,
                gender: gender || undefined,
                isAvailable: isEligible ? isAvailable : false,
                isEligibleToDonate: isEligible,
                donationCooldownUntil: cooldownUntil,
                roles: roles,
                lastActiveRole: lastActiveRole as 'donor' | 'requester',
                lastDonationDate: lastDonationDate ? Timestamp.fromDate(lastDonationDate) : null,
                fcmToken: (await getFCMToken()) || undefined,
                location: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    geohash: locationData.geohash,
                },
                email: currentUser.email || '',
                photoURL: currentUser.photoURL || '',
                isVerified: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await createUserDocument(userData);
            navigation.replace(roles.includes('donor') ? 'DonorDashboard' : 'RequesterDashboard', { tab: 'home' });
        } catch (error: any) {
            console.error('Registration Error:', error);
            showModal({
                title: 'Registration Failed',
                description: error.message || 'Something went wrong',
                type: 'error',
                primaryText: 'Retry'
            });
        } finally {
            setLoading(false);
        }
    }, [validateForm, name, phone, bloodGroup, address, age, gender, isAvailable, lastDonationDate, locationData, navigation, showModal]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        showModal({
                            title: 'Exit Registration?',
                            description: "Going back will sign you out. You'll need to complete this setup next time you log in.",
                            type: 'warning',
                            primaryText: 'Sign Out',
                            onPrimaryPress: async () => {
                                try {
                                    await signOut();
                                } catch (error) {
                                    navigation.replace('Auth');
                                }
                            },
                            secondaryText: 'Stay',
                        });
                    }}
                    style={styles.backButton}
                >
                    <MaterialIcon name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile Setup</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

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

                        <View style={[styles.inputGroup, { zIndex: 100 }]}>
                            <Text style={styles.label}>Blood Group <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.inputWrapper}
                                onPress={() => {
                                    setShowBloodGroupPicker(!showBloodGroupPicker);
                                    setShowGenderPicker(false);
                                }}
                            >
                                <Text style={{ color: bloodGroup ? '#1E293B' : '#94A3B8' }}>
                                    {bloodGroup || "Select blood type"}
                                </Text>
                                <MaterialCommunityIcon name="chevron-down" size={20} color={Colors.primary} />
                            </TouchableOpacity>
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
                            {isDetecting ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                    <ActivityIndicator size="small" color="#94A3B8" />
                                    <Text style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4, fontWeight: '500' }}>Verifying address...</Text>
                                </View>
                            ) : locationData ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                    <MaterialIcon name="check-circle" size={14} color="#10B981" />
                                    <Text style={{ fontSize: 11, color: '#10B981', marginLeft: 4, fontWeight: '600' }}>Location Verified</Text>
                                </View>
                            ) : address.length > 3 ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                    <MaterialIcon name="error" size={14} color="#F59E0B" />
                                    <Text style={{ fontSize: 11, color: '#F59E0B', marginLeft: 4, fontWeight: '600' }}>Location unverified. Keep typing or use Fetch.</Text>
                                </View>
                            ) : null}
                            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                        </View>



                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Age</Text>
                                <TextInput style={styles.input} placeholder="25" keyboardType="numeric" value={age} onChangeText={setAge} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8, zIndex: 90 }]}>
                                <Text style={styles.label}>Gender</Text>
                                <TouchableOpacity
                                    style={styles.inputWrapper}
                                    onPress={() => {
                                        setShowGenderPicker(!showGenderPicker);
                                        setShowBloodGroupPicker(false);
                                    }}
                                >
                                    <Text style={{ color: gender ? '#1E293B' : '#94A3B8' }}>
                                        {gender || "Select"}
                                    </Text>
                                    <MaterialCommunityIcon name="chevron-down" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                                {showGenderPicker && (
                                    <View style={styles.dropdown}>
                                        {GENDERS.map(item => (
                                            <TouchableOpacity
                                                key={item}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setGender(item);
                                                    setShowGenderPicker(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownText}>{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
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



            {showDatePicker && (
                <DateTimePicker
                    value={lastDonationDate || new Date()}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={handleDateChange}
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
    logoContainer: { width: 60, height: 60, backgroundColor: '#FEE2E2', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginTop: 20 },
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
    dropdown: {
        position: 'absolute',
        top: 70,
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dropdownText: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
    },
});

export default UnifiedRegistrationScreen;
