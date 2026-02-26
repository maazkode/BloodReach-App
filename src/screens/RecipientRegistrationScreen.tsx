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
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import auth from '@react-native-firebase/auth';
import { createUserDocument } from '../services/firestoreService';
import { UserDocument } from '../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipientRegistration'>;

const RecipientRegistrationScreen: React.FC<Props> = ({ navigation }) => {
    // Form fields
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');

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
        if (!address) tempErrors.address = 'Detailed address is required';

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
                role: 'requester',
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
                    latitude: 0, // Should use Geolocation in a real app
                    longitude: 0,
                },
                isAvailable: false,
                lastDonationDate: null,
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
                <Text style={styles.headerTitle}>Requester Registration</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.brandingSection}>
                        <View style={styles.logoContainer}>
                            <MaterialIcon name="person-add" size={30} color={Colors.primary} />
                        </View>
                        <Text style={styles.mainTitle}>Join BloodReach</Text>
                        <Text style={styles.subtitle}>Complete your profile to start requesting blood.</Text>
                    </View>

                    <View style={styles.card}>
                        {/* Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} placeholder="John Doe" value={name} onChangeText={setName} />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        {/* Age & Weight Row */}
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
                            <TextInput style={styles.input} placeholder="A+, B-, AB+, O+" value={bloodGroup} onChangeText={setBloodGroup} />
                        </View>

                        {/* Phone */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput style={styles.input} placeholder="+92XXXXXXXXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                        </View>

                        {/* City */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>City</Text>
                            <TextInput style={styles.input} placeholder="City Name" value={city} onChangeText={setCity} />
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
                            <Text style={styles.registerButtonText}>{loading ? 'Saving...' : 'Complete Registration'}</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'white' },
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
    row: { flexDirection: 'row' },
    registerButton: { backgroundColor: Colors.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    registerButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
    errorText: { color: Colors.error, fontSize: 11, marginTop: 4 },
});

export default RecipientRegistrationScreen;
