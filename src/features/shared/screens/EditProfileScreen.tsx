import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { useAuth } from '../context/AuthContext';
import { getUserDocument, createUserDocument } from '../services/firestoreService';
import { useModal } from '../context/ModalContext';
import { safeRun } from '../utils/errorHandler';
import { Colors } from '../theme/colors';
import { getFullLocationData, forwardGeocode, LocationData } from '../services/locationService';
import { geohashForLocation } from 'geofire-common';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from '@react-native-firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
    const { user } = useAuth();
    const { showModal } = useModal();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [lastDonationDate, setLastDonationDate] = useState<Date | null>(null);
    const [locationData, setLocationData] = useState<LocationData | null>(null);

    // UI State
    const [isBloodModalVisible, setIsBloodModalVisible] = useState(false);
    const [isGenderModalVisible, setIsGenderModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            const data = await getUserDocument(user.uid);
            if (data) {
                setName(data.name || '');
                setPhone(data.phone || '');
                setBloodGroup(data.bloodGroup || '');
                setGender(data.gender || '');
                setAge(data.age ? String(data.age) : '');
                setCity(data.city || '');
                setAddress(data.address || '');
                if (data.lastDonationDate) {
                    setLastDonationDate((data.lastDonationDate as Timestamp).toDate());
                }
                if (data.location) {
                    setLocationData({
                        latitude: data.location.latitude,
                        longitude: data.location.longitude,
                        geohash: data.location.geohash,
                        address: data.address || ''
                    });
                }
            }
            setLoading(false);
        };
        fetchUserData();
    }, [user]);

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
                }
            } catch (error) {
                // Silently fail manual lookup
            } finally {
                setIsDetecting(false);
            }
        }, 1500);

        return () => clearTimeout(delayDebounceFn);
    }, [address]);

    const handleFetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const data = await getFullLocationData();
            setLocationData(data);
            if (data.address) {
                setAddress(data.address);
                setCity(data.address.split(',')[0].trim());
            }
        } catch (error: any) {
            showModal({
                title: 'Detection Failed',
                description: error.message || 'Could not detect location.',
                type: 'error',
                primaryText: 'OK'
            });
        } finally {
            setFetchingLocation(false);
        }
    };

    const handleSave = async () => {
        if (!user || !name.trim() || !phone.trim()) {
            showModal({
                title: 'Required Fields',
                description: 'Name and Phone are mandatory.',
                type: 'error',
                primaryText: 'OK'
            });
            return;
        }

        setSaving(true);
        await safeRun(
            () => createUserDocument({
                uid: user.uid,
                name: name.trim(),
                phone: phone.trim(),
                bloodGroup,
                gender,
                age: age ? Number(age) : undefined,
                lastDonationDate: lastDonationDate ? Timestamp.fromDate(lastDonationDate) : null,
                city: city.trim(),
                address: address.trim(),
                location: locationData ? {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    geohash: locationData.geohash,
                } : undefined,
            }),
            {
                context: 'EditProfile > handleSave',
                errorTitle: 'Update Failed',
                showModal,
                onSuccess: () => {
                    showModal({
                        title: 'Success',
                        description: 'Profile updated in Firestore successfully!',
                        type: 'success',
                        primaryText: 'Done',
                        onPrimaryPress: () => navigation.goBack()
                    });
                }
            }
        );
        setSaving(false);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#B62022" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcon name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#B62022" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Basic Info */}
                    <Text style={styles.sectionLabel}>Basic Information</Text>
                    <View style={styles.card}>
                        <InputField label="Full Name" icon="person-outline" value={name} onChange={setName} placeholder="Your name" />
                        <InputField label="Phone Number" icon="phone-iphone" value={phone} onChange={setPhone} placeholder="+92..." keyboardType="phone-pad" />

                        <View style={styles.row}>
                            <SelectField
                                label="Blood Group"
                                icon="bloodtype"
                                value={bloodGroup}
                                onPress={() => setIsBloodModalVisible(true)}
                                flex={1}
                                marginR={8}
                            />
                            <InputField
                                label="Age"
                                icon="cake"
                                value={age}
                                onChange={setAge}
                                placeholder="25"
                                keyboardType="numeric"
                                flex={1}
                                marginL={8}
                            />
                        </View>

                        <SelectField
                            label="Gender"
                            icon="face"
                            value={gender}
                            onPress={() => setIsGenderModalVisible(true)}
                        />

                        <SelectField
                            label="Last Donation Date"
                            icon="calendar-today"
                            value={lastDonationDate ? lastDonationDate.toDateString() : 'Never / Not Sure'}
                            onPress={() => setShowDatePicker(true)}
                        />
                    </View>

                    {/* Location Info */}
                    <Text style={styles.sectionLabel}>Location & Address</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Address</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.textInput}
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder="House, Street, Area"
                                    multiline
                                />
                                <TouchableOpacity onPress={handleFetchLocation} disabled={fetchingLocation} style={styles.fetchBtn}>
                                    {fetchingLocation ? <ActivityIndicator size="small" color="#B62022" /> : <MaterialIcon name="my-location" size={20} color="#B62022" />}
                                </TouchableOpacity>
                            </View>
                            {isDetecting ? (
                                <View style={styles.statusRow}>
                                    <ActivityIndicator size="small" color="#94A3B8" />
                                    <Text style={styles.statusText}>Verifying address...</Text>
                                </View>
                            ) : locationData ? (
                                <View style={styles.statusRow}>
                                    <MaterialIcon name="check-circle" size={14} color="#10B981" />
                                    <Text style={[styles.statusText, { color: '#10B981' }]}>Location Verified</Text>
                                </View>
                            ) : address.length > 3 ? (
                                <View style={styles.statusRow}>
                                    <MaterialIcon name="error" size={14} color="#F59E0B" />
                                    <Text style={[styles.statusText, { color: '#F59E0B' }]}>Unverified. Keep typing or Fetch.</Text>
                                </View>
                            ) : null}
                        </View>
                        <InputField label="City" icon="location-city" value={city} onChange={setCity} placeholder="City name" />
                    </View>

                    <TouchableOpacity
                        style={[styles.footerSaveBtn, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Text style={styles.footerSaveText}>{saving ? 'Updating Backend...' : 'Update Profile'}</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modals */}
            <SelectionModal
                visible={isBloodModalVisible}
                onClose={() => setIsBloodModalVisible(false)}
                title="Select Blood Group"
                data={BLOOD_GROUPS}
                selected={bloodGroup}
                onSelect={(val: any) => { setBloodGroup(val); setIsBloodModalVisible(false); }}
                isGrid
            />
            <SelectionModal
                visible={isGenderModalVisible}
                onClose={() => setIsGenderModalVisible(false)}
                title="Select Gender"
                data={GENDERS}
                selected={gender}
                onSelect={(val: any) => { setGender(val); setIsGenderModalVisible(false); }}
            />

            {showDatePicker && (
                <DateTimePicker
                    value={lastDonationDate || new Date()}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(event: any, date?: Date) => {
                        setShowDatePicker(false);
                        if (date) setLastDonationDate(date);
                    }}
                />
            )}

        </SafeAreaView>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const InputField = ({ label, icon, value, onChange, placeholder, keyboardType, flex, marginL, marginR }: any) => (
    <View style={[styles.inputGroup, flex && { flex }, marginL && { marginLeft: marginL }, marginR && { marginRight: marginR }]}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrapper}>
            <MaterialIcon name={icon} size={20} color="#94A3B8" style={styles.fieldIcon} />
            <TextInput
                style={styles.textInput}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                keyboardType={keyboardType}
            />
        </View>
    </View>
);

const SelectField = ({ label, icon, value, onPress, flex, marginL, marginR }: any) => (
    <View style={[styles.inputGroup, flex && { flex }, marginL && { marginLeft: marginL }, marginR && { marginRight: marginR }]}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.inputWrapper} onPress={onPress}>
            <MaterialIcon name={icon} size={20} color="#94A3B8" style={styles.fieldIcon} />
            <Text style={[styles.textInput, { color: value ? '#1E293B' : '#94A3B8', paddingTop: 14 }]}>{value || 'Select'}</Text>
            <MaterialIcon name="expand-more" size={20} color="#94A3B8" />
        </TouchableOpacity>
    </View>
);

const SelectionModal = ({ visible, onClose, title, data, selected, onSelect, isGrid }: any) => (
    <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{title}</Text>
                <View style={isGrid ? styles.modalGrid : null}>
                    {data.map((item: string) => (
                        <TouchableOpacity
                            key={item}
                            onPress={() => onSelect(item)}
                            style={[
                                isGrid ? styles.gridItem : styles.listItem,
                                selected === item && styles.itemSelected
                            ]}
                        >
                            <Text style={[styles.itemText, selected === item && styles.itemTextSelected]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    saveText: { fontSize: 16, fontWeight: '700', color: '#B62022' },
    scrollContent: { padding: 20 },
    sectionLabel: { fontSize: 13, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12 },
    fieldIcon: { marginRight: 10 },
    textInput: { flex: 1, height: 48, fontSize: 15, color: '#1E293B', fontWeight: '600' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 4 },
    statusText: { fontSize: 11, color: '#94A3B8', marginLeft: 4, fontWeight: '600' },
    row: { flexDirection: 'row' },
    fetchBtn: { padding: 10 },
    footerSaveBtn: { backgroundColor: '#B62022', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#B62022', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5, marginTop: 10 },
    footerSaveText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 30 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 20 },
    modalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '23%', aspectRatio: 1, backgroundColor: '#F1F5F9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    listItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    itemSelected: { backgroundColor: '#B62022' },
    itemText: { fontSize: 15, fontWeight: '700', color: '#475569' },
    itemTextSelected: { color: '#fff' },
    closeBtn: { marginTop: 15, alignItems: 'center' },
    closeBtnText: { color: '#94A3B8', fontWeight: '700' },
});

export default EditProfileScreen;
