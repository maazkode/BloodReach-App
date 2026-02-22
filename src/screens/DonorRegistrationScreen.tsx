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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'DonorRegistration'>;

const DonorRegistrationScreen: React.FC<Props> = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [city, setCity] = useState('');
    const [lastDonation, setLastDonation] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isBloodGroupModalVisible, setIsBloodGroupModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Error states
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateField = (field: string, value: string) => {
        let error = '';
        switch (field) {
            case 'fullName':
                if (!value || value.length < 3) error = 'Enter a valid full name (min 3 characters)';
                break;
            case 'age':
                const ageNum = parseInt(value);
                if (!value || isNaN(ageNum) || ageNum < 18 || ageNum > 65) error = 'Age must be between 18 and 65';
                break;
            case 'weight':
                const weightNum = parseInt(value);
                if (!value || isNaN(weightNum) || weightNum < 50) error = 'Weight must be at least 50 kg';
                break;
            case 'bloodGroup':
                if (!value) error = 'Please select a blood group';
                break;
            case 'city':
                if (!value || value.length < 2) error = 'Enter your city';
                break;
            case 'phone':
                const phoneRegex = /^\+92[0-9]{10}$/;
                if (!value || !phoneRegex.test(value)) error = 'Enter valid Pakistani phone number';
                break;
            case 'password':
                if (!value || value.length < 6) error = 'Password must be at least 6 characters';
                break;
            case 'lastDonation':
                if (value) {
                    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
                    if (!dateRegex.test(value)) {
                        error = 'Format must be mm/dd/yyyy';
                    } else {
                        const [m, d, y] = value.split('/').map(Number);
                        const donationDate = new Date(y, m - 1, d);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        if (donationDate > today) {
                            error = 'Date cannot be in the future';
                        } else {
                            const diffTime = Math.abs(today.getTime() - donationDate.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays < 90) {
                                error = 'You can donate again after 90 days';
                            }
                        }
                    }
                }
                break;
        }
        setErrors(prev => ({ ...prev, [field]: error }));
        return error === '';
    };

    const handleFieldChange = (field: string, value: string) => {
        switch (field) {
            case 'fullName': setFullName(value); break;
            case 'age': setAge(value); break;
            case 'weight': setWeight(value); break;
            case 'bloodGroup':
                setBloodGroup(value);
                setIsBloodGroupModalVisible(false);
                break;
            case 'city': setCity(value); break;
            case 'lastDonation': setLastDonation(value); break;
            case 'phone': setPhone(value); break;
            case 'password': setPassword(value); break;
        }
        validateField(field, value);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formattedDate = `${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getDate().toString().padStart(2, '0')}/${selectedDate.getFullYear()}`;
            handleFieldChange('lastDonation', formattedDate);
        }
    };

    const isFormValid = () => {
        const fieldValidations = [
            validateField('fullName', fullName),
            validateField('age', age),
            validateField('weight', weight),
            validateField('bloodGroup', bloodGroup),
            validateField('city', city),
            validateField('phone', phone),
            validateField('password', password),
            validateField('lastDonation', lastDonation),
        ];
        return fieldValidations.every(v => v === true);
    };

    const handleRegister = () => {
        if (isFormValid()) {
            console.log("Saving user data...", { fullName, age, weight, bloodGroup, city, phone });
            // Set isProfileComplete = true in your auth context or database here
            navigation.replace('Home');
        }
    };

    const isSubmitDisabled = !fullName || !age || !weight || !bloodGroup || !city || !phone || !password || Object.values(errors).some(e => e !== '');

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialIcon name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Donor Account</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    {/* Branding Section */}
                    <View style={styles.brandingSection}>
                        <View style={styles.logoContainer}>
                            <MaterialIcon name="water-drop" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.mainTitle}>Join BloodReach</Text>
                        <Text style={styles.subtitle}>Your small act can save a life. Register today.</Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.card}>
                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={[styles.inputWrapper, errors.fullName ? styles.inputError : null]}>
                                <MaterialIcon name="person" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor="#94A3B8"
                                    value={fullName}
                                    onChangeText={(v) => handleFieldChange('fullName', v)}
                                />
                            </View>
                            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
                        </View>

                        {/* Age and Weight Row */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.label}>Age</Text>
                                <View style={[styles.inputWrapper, errors.age ? styles.inputError : null]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="25"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={age}
                                        onChangeText={(v) => handleFieldChange('age', v)}
                                    />
                                </View>
                                {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                                <Text style={styles.label}>Weight (kg)</Text>
                                <View style={[styles.inputWrapper, errors.weight ? styles.inputError : null]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="70"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        value={weight}
                                        onChangeText={(v) => handleFieldChange('weight', v)}
                                    />
                                </View>
                                {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}
                            </View>
                        </View>

                        {/* Blood Group */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Blood Group</Text>
                            <TouchableOpacity
                                style={[styles.inputWrapper, errors.bloodGroup ? styles.inputError : null]}
                                activeOpacity={0.7}
                                onPress={() => setIsBloodGroupModalVisible(true)}
                            >
                                <MaterialIcon name="opacity" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <Text style={[styles.input, { color: bloodGroup ? '#1E293B' : '#94A3B8', paddingTop: 14 }]}>
                                    {bloodGroup || "Select blood type"}
                                </Text>
                                <MaterialIcon name="expand-more" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                            {errors.bloodGroup ? <Text style={styles.errorText}>{errors.bloodGroup}</Text> : null}
                        </View>

                        {/* City */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>City</Text>
                            <View style={[styles.inputWrapper, errors.city ? styles.inputError : null]}>
                                <MaterialIcon name="location-pin" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter city"
                                    placeholderTextColor="#94A3B8"
                                    value={city}
                                    onChangeText={(v) => handleFieldChange('city', v)}
                                />
                            </View>
                            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
                        </View>

                        {/* Last Donation Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Last Donation Date</Text>
                            <View style={[styles.inputWrapper, errors.lastDonation ? styles.inputError : null]}>
                                <MaterialIcon name="calendar-today" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="mm/dd/yyyy"
                                    placeholderTextColor="#94A3B8"
                                    value={lastDonation}
                                    onChangeText={(v) => handleFieldChange('lastDonation', v)}
                                />
                                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                    <MaterialIcon name="calendar-today" size={18} color={Colors.primary} />
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={(() => {
                                            if (lastDonation) {
                                                const d = new Date(lastDonation);
                                                return isNaN(d.getTime()) ? new Date() : d;
                                            }
                                            return new Date();
                                        })()}
                                        mode="date"
                                        display="default"
                                        maximumDate={new Date()}
                                        onChange={handleDateChange}
                                    />
                                )}
                            </View>
                            {errors.lastDonation ? <Text style={styles.errorText}>{errors.lastDonation}</Text> : null}
                        </View>

                        {/* Phone Number */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={[styles.inputWrapper, errors.phone ? styles.inputError : null]}>
                                <MaterialIcon name="phone" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="+92 XXX XXX XXXX"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={(v) => handleFieldChange('phone', v)}
                                />
                            </View>
                            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
                        </View>

                        {/* Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
                                <MaterialIcon name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="********"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={(v) => handleFieldChange('password', v)}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <MaterialIcon
                                        name={showPassword ? "visibility" : "visibility-off"}
                                        size={20}
                                        color="#94A3B8"
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.registerButton, isSubmitDisabled ? styles.buttonDisabled : null]}
                            onPress={handleRegister}
                            disabled={isSubmitDisabled}
                        >
                            <Text style={styles.registerButtonText}>Register</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => navigation.navigate('Auth', { role: 'donor' })}>
                            <Text style={styles.footerText}>
                                Already have an account? <Text style={styles.loginText}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </ScrollView>

            {/* Blood Group Modal */}
            <Modal
                visible={isBloodGroupModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsBloodGroupModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Blood Group</Text>
                        <FlatList
                            data={BLOOD_GROUPS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => handleFieldChange('bloodGroup', item)}
                                >
                                    <Text style={styles.modalItemText}>{item}</Text>
                                    {bloodGroup === item && <MaterialIcon name="check" size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setIsBloodGroupModalVisible(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: 'white',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    brandingSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30,
    },
    logoContainer: {
        width: 60,
        height: 60,
        backgroundColor: '#FDECEC',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
    },
    row: {
        flexDirection: 'row',
    },
    registerButton: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        marginTop: 24,
        marginBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#64748B',
    },
    loginText: {
        color: Colors.primary,
        fontWeight: '700',
    },
    inputError: {
        borderColor: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: 11,
        marginTop: 4,
        marginLeft: 4,
    },
    buttonDisabled: {
        backgroundColor: '#E2E8F0',
        shadowColor: 'transparent',
        elevation: 0,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '60%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalItemText: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500',
    },
    modalCloseButton: {
        marginTop: 15,
        paddingVertical: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
});

export default DonorRegistrationScreen;
