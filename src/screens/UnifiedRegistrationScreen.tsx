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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

type Props = NativeStackScreenProps<RootStackParamList, 'UnifiedRegistration'>;

const UnifiedRegistrationScreen: React.FC<Props> = ({ navigation }) => {
    // Required Fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [city, setCity] = useState('');

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

    const validateForm = () => {
        let tempErrors: { [key: string]: string } = {};
        if (!name.trim()) tempErrors.name = 'Full name is required';
        if (!phone.trim()) tempErrors.phone = 'Phone number is required';
        if (!bloodGroup) tempErrors.bloodGroup = 'Blood group is required';
        if (!city.trim()) tempErrors.city = 'City is required';

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const currentUser = getAuth().currentUser;
            if (!currentUser) throw new Error('No authenticated user found');

            const userData: UserDocument = {
                uid: currentUser.uid,
                name,
                phone,
                bloodGroup,
                city,
                age: age ? Number(age) : undefined,
                gender: gender || undefined,
                isAvailable: isAvailable,
                isDonor: isAvailable, // If available to donate, they are a donor
                isRequester: true, // Everyone can be a requester
                primaryRole: isAvailable ? 'donor' : 'requester',
                lastDonationDate: lastDonationDate ? Timestamp.fromDate(lastDonationDate) : null,

                // System / Placeholders for removed fields
                email: currentUser.email || '',
                photoURL: currentUser.photoURL || '',
                location: { latitude: 0, longitude: 0 },
                isVerified: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await createUserDocument(userData);
            navigation.replace(userData.isDonor ? 'DonorDashboard' : 'RequesterDashboard');
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
                        <Text style={styles.subtitle}>Fill in your details to start saving lives or requesting help.</Text>
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
                            <Text style={styles.label}>City <Text style={styles.required}>*</Text></Text>
                            <TextInput style={styles.input} placeholder="e.g. Karachi, Lahore" value={city} onChangeText={setCity} />
                            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
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

                        <View style={styles.donorSection}>
                            <View style={styles.donorInfo}>
                                <Text style={styles.donorTitle}>Available to Donate?</Text>
                                <Text style={styles.donorSubtitle}>Turn on to show up as a potential donor</Text>
                            </View>
                            <Switch
                                value={isAvailable}
                                onValueChange={setIsAvailable}
                                trackColor={{ false: '#E2E8F0', true: '#FEE2E2' }}
                                thumbColor={isAvailable ? Colors.primary : '#94A3B8'}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.registerButton, loading && { opacity: 0.7 }]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.registerButtonText}>{loading ? 'Saving Profile...' : 'Complete Profile'}</Text>
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
});

export default UnifiedRegistrationScreen;
