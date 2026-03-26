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
    ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRequest'>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CreateRequestScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [bloodGroup, setBloodGroup] = useState('');
    const [units, setUnits] = useState('');
    const [hospital, setHospital] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isEmergency, setIsEmergency] = useState(false);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Blood Request</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Urgent Assistance Info Card */}
                <View style={styles.urgentCard}>
                    <View style={styles.urgentIconBox}>
                        <View style={styles.diamondShape}>
                            <MaterialIcon name="priority-high" size={24} color="#DC2626" />
                        </View>
                    </View>
                    <View style={styles.urgentContent}>
                        <Text style={styles.urgentTitle}>URGENT ASSISTANCE</Text>
                        <Text style={styles.urgentSub}>
                            Fill in the details to find blood donors in your immediate vicinity.
                        </Text>
                    </View>
                </View>

                {/* Form Card */}
                <View style={styles.formCard}>
                    {/* Blood Group */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Group Needed</Text>
                        <TouchableOpacity
                            style={styles.dropdownPicker}
                            onPress={() => setShowBloodGroupPicker(!showBloodGroupPicker)}
                        >
                            <Text style={[styles.pickerText, !bloodGroup && { color: '#94A3B8' }]}>
                                {bloodGroup || 'Select Blood Group'}
                            </Text>
                            <MaterialCommunityIcon name="unfold-more-horizontal" size={24} color="#94A3B8" />
                        </TouchableOpacity>

                        {showBloodGroupPicker && (
                            <View style={styles.bloodGroupDropdown}>
                                {BLOOD_GROUPS.map((group) => (
                                    <TouchableOpacity
                                        key={group}
                                        style={styles.bloodGroupItem}
                                        onPress={() => {
                                            setBloodGroup(group);
                                            setShowBloodGroupPicker(false);
                                        }}
                                    >
                                        <Text style={styles.bloodGroupText}>{group}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Units Required */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Units Required</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcon name="water-outline" size={22} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 2"
                                keyboardType="numeric"
                                value={units}
                                onChangeText={setUnits}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    {/* Hospital Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Hospital Name</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialIcon name="add-box" size={22} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter hospital name"
                                value={hospital}
                                onChangeText={setHospital}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    {/* Required Date */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Required Date</Text>
                        <TouchableOpacity
                            style={styles.inputWrapper}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <MaterialCommunityIcon name="calendar-range" size={22} color="#94A3B8" style={styles.inputIcon} />
                            <Text style={styles.pickerText}>
                                {date.toLocaleDateString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric'
                                })}
                            </Text>
                            <View style={{ flex: 1 }} />
                            <MaterialIcon name="calendar-today" size={20} color="#000000" />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>

                    {/* Emergency Toggle */}
                    <View style={styles.emergencyContainer}>
                        <MaterialIcon name="report-problem" size={24} color="#DC2626" style={{ marginRight: 15 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.emergencyLabel}>Emergency Request</Text>
                            <Text style={styles.emergencySubtext}>Mark as high priority for faster matching</Text>
                        </View>
                        <Switch
                            value={isEmergency}
                            onValueChange={setIsEmergency}
                            trackColor={{ false: '#E2E8F0', true: '#DC2626' }}
                            thumbColor={isEmergency ? '#FFFFFF' : '#FFFFFF'}
                        />
                    </View>
                </View>

                {/* Agreement Text */}
                <Text style={styles.agreementText}>
                    BY SUBMITTING, YOU AGREE TO BLOODREACH'S TERMS AND PRIVACY POLICY REGARDING EMERGENCY MEDICAL REQUESTS.
                </Text>

                {/* Submit Button */}
                <TouchableOpacity style={styles.submitButton}>
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                    <MaterialIcon name="send" size={20} color="white" style={{ marginLeft: 10 }} />
                </TouchableOpacity>

                {/* Map Bottom Hint */}
                <View style={styles.mapContainer}>
                    <ImageBackground
                        source={{ uri: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-87.6298,41.8781,12,0/400x200?access_token=pk.eyJ1IjoiYW50aWdyYXZpdHkiLCJhIjoiY2xwYnhqbW1qMDJqdjJwbzBsdzZqdzZqdyJ9.dummy' }}
                        style={styles.mapBackground}
                    >
                        <View style={styles.mapOverlay} />
                    </ImageBackground>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 15,
        backgroundColor: 'white',
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    urgentCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    urgentIconBox: {
        width: 60,
        height: 60,
        backgroundColor: '#FDECEC',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    diamondShape: {
        width: 32,
        height: 32,
        backgroundColor: '#DC262620',
        transform: [{ rotate: '45deg' }],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#DC2626',
    },
    urgentContent: { flex: 1, justifyContent: 'center' },
    urgentTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    urgentSub: { fontSize: 12, color: '#64748B', lineHeight: 18 },
    formCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 25,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 10 },
    dropdownPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        height: 55,
        paddingHorizontal: 16,
    },
    pickerText: { fontSize: 16, color: '#1E293B' },
    bloodGroupDropdown: {
        marginTop: 5,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 5,
    },
    bloodGroupItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    bloodGroupText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        height: 55,
        paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#1E293B' },
    emergencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 5,
    },
    emergencyLabel: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    emergencySubtext: { fontSize: 12, color: '#64748B', marginTop: 2 },
    agreementText: {
        fontSize: 10,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 20,
        marginBottom: 25,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    submitButton: {
        backgroundColor: '#DC2626',
        borderRadius: 16,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 30,
    },
    submitButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
    mapContainer: {
        height: 120,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
    },
    mapBackground: { width: '100%', height: '100%' },
    mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)' },
});

export default CreateRequestScreen;
