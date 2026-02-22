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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipientRegistration'>;

const RecipientRegistrationScreen: React.FC<Props> = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Error states
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateField = (field: string, value: string) => {
        let error = '';
        switch (field) {
            case 'fullName':
                if (!value || value.length < 3) error = 'Enter a valid full name (min 3 characters)';
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
        }
        setErrors(prev => ({ ...prev, [field]: error }));
        return error === '';
    };

    const handleFieldChange = (field: string, value: string) => {
        switch (field) {
            case 'fullName': setFullName(value); break;
            case 'city': setCity(value); break;
            case 'phone': setPhone(value); break;
            case 'password': setPassword(value); break;
        }
        validateField(field, value);
    };

    const isFormValid = () => {
        const fieldValidations = [
            validateField('fullName', fullName),
            validateField('city', city),
            validateField('phone', phone),
            validateField('password', password),
        ];
        return fieldValidations.every(v => v === true);
    };

    const handleRegister = () => {
        if (isFormValid()) {
            console.log("Saving recipient data...", { fullName, city, phone });
            // Set recipientProfileComplete = true in your auth context or database here
            navigation.replace('Home');
        }
    };

    const isSubmitDisabled = !fullName || !city || !phone || !password || Object.values(errors).some(e => e !== '');

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
                <Text style={styles.headerTitle}>Create Recipient Account</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    {/* Branding Section */}
                    <View style={styles.brandingSection}>
                        <View style={styles.logoContainer}>
                            <MaterialIcon name="person-add" size={30} color={Colors.primary} />
                        </View>
                        <Text style={styles.mainTitle}>Join BloodReach</Text>
                        <Text style={styles.subtitle}>
                            Fill in your details to start requesting blood donations in your area.
                        </Text>
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
                                    placeholder="e.g. John Doe"
                                    placeholderTextColor="#94A3B8"
                                    value={fullName}
                                    onChangeText={(v) => handleFieldChange('fullName', v)}
                                />
                            </View>
                            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
                        </View>

                        {/* City */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>City</Text>
                            <View style={[styles.inputWrapper, errors.city ? styles.inputError : null]}>
                                <MaterialIcon name="location-pin" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your city"
                                    placeholderTextColor="#94A3B8"
                                    value={city}
                                    onChangeText={(v) => handleFieldChange('city', v)}
                                />
                            </View>
                            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
                        </View>

                        {/* Phone Number */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={[styles.inputWrapper, errors.phone ? styles.inputError : null]}>
                                <MaterialIcon name="phone" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="+92XXXXXXXXXX"
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
                        <TouchableOpacity onPress={() => navigation.navigate('Auth', { role: 'requester' })}>
                            <Text style={styles.footerText}>
                                Already have an account? <Text style={styles.loginText}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </ScrollView>
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
        fontSize: 22,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#777',
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
});

export default RecipientRegistrationScreen;
