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
    FlatList,
    Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import auth from '@react-native-firebase/auth';
import { createUserDocument } from '../services/firestoreService';
import { UserDocument } from '../types/database';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type Props = NativeStackScreenProps<RootStackParamList, 'DonorRegistration'>;

const DonorRegistrationScreen: React.FC<Props> = ({ navigation }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [lastDonationDate, setLastDonationDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isBloodGroupModalVisible, setIsBloodGroupModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = () => {
        let tempErrors: { [key: string]: string } = {};
        if (!name) tempErrors.name = 'Full name is required';
        if (!age || isNaN(Number(age))) tempErrors.age = 'Valid age is required';
        if (!weight || isNaN(Number(weight))) tempErrors.weight = 'Valid weight is required';
        if (!bloodGroup) tempErrors.bloodGroup = 'Blood group is required';
        if (!phone) tempErrors.phone = 'Phone number is required';
        if (!city) tempErrors.city = 'City is required';
        if (!address) tempErrors.address = 'Address is required';

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const currentUser = auth().currentUser;
            if (!currentUser) throw new Error('No authenticated user found');

            const userData: Partial<UserDocument> = {
                uid: currentUser.uid,
                role: 'donor',
                name,
                age: Number(age),
                weight: Number(weight),
                bloodGroup,
                phone,
                city,
                address,
                email: currentUser.email || '',
                photoURL: currentUser.photoURL || '',
                location: {
                    latitude: 0,
                    longitude: 0,
                },
                isAvailable: true, // true because role === "donor"
                lastDonationDate: lastDonationDate ? firestore.Timestamp.fromDate(lastDonationDate) : null,
                isVerified: false,
            };

            await createUserDocument(userData);
            navigation.replace('Home');
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
                <Text style={styles.headerTitle}>Donor Registration</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.brandingSection}>
                        <View style={styles.logoContainer}>
                            <MaterialIcon name="water-drop" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.mainTitle}>Join BloodReach</Text>
                        <Text style={styles.subtitle}>Your small act can save a life. Register as a donor.</Text>
                    </View>

                    <View style={styles.card}>
                        {/* Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} placeholder="John Doe" value={name} onChangeText={setName} />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        {/* Age & Weight */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Age</Text>
                                <TextInput style={styles.input} placeholder="25" keyboardType="numeric" value={age} onChangeText={setAge} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Weight (kg)</Text>
                                <TextInput style={styles.input} placeholder="70" keyboardType="numeric" value={weight} onChangeText={setWeight} />
                            </View>
                        </View>

                        {/* Blood Group */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Blood Group</Text>
                            <TouchableOpacity
                                style={styles.inputWrapper}
                                onPress={() => setIsBloodGroupModalVisible(true)}
                            >
                                <Text style={{ color: bloodGroup ? '#1E293B' : '#94A3B8' }}>
                                    {bloodGroup || "Select blood type"}
                                </Text>
                                <MaterialIcon name="expand-more" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        {/* City */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>City</Text>
                            <TextInput style={styles.input} placeholder="Your City" value={city} onChangeText={setCity} />
                        </View>

                        {/* Phone */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput style={styles.input} placeholder="+92XXXXXXXXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                        </View>

                        {/* Last Donation Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Last Donation Date (Optional)</Text>
                            <TouchableOpacity
                                style={styles.inputWrapper}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: lastDonationDate ? '#1E293B' : '#94A3B8' }}>
                                    {lastDonationDate ? lastDonationDate.toDateString() : "Select date if you donated before"}
                                </Text>
                                <MaterialIcon name="calendar-today" size={20} color="#94A3B8" />
                            </TouchableOpacity>
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
                        </View>

                        {/* Address */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Address</Text>
                            <TextInput style={styles.input} placeholder="Full Home Address" multiline value={address} onChangeText={setAddress} />
                        </View>

                        <TouchableOpacity
                            style={[styles.registerButton, loading && { opacity: 0.7 }]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.registerButtonText}>{loading ? 'Saving...' : 'Become a Donor'}</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </ScrollView>

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
                            <Text style={styles.modalCloseButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1E293B' },
    inputWrapper: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 16, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row' },
    registerButton: { backgroundColor: Colors.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
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
    modalCloseButton: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
    modalCloseButtonText: { color: '#64748B', fontWeight: '600' },
});

export default DonorRegistrationScreen;
