import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ContactBarProps {
    phone: string;
    onWhatsApp: () => void;
    style?: any;
}

const ContactBar = React.memo(({ phone, onWhatsApp, style }: ContactBarProps) => (
    <View style={[styles.contactRow, style]}>
        <TouchableOpacity 
            style={styles.contactBtn} 
            onPress={() => Linking.openURL(`tel:${phone}`)}
        >
            <MaterialIcon name="phone" size={20} color="#B62022" />
            <Text style={styles.contactBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.contactBtn, { backgroundColor: '#F0FDF4' }]} 
            onPress={onWhatsApp}
        >
            <MaterialCommunityIcon name="whatsapp" size={20} color="#22C55E" />
            <Text style={[styles.contactBtnText, { color: '#22C55E' }]}>WhatsApp</Text>
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    contactRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    contactBtn: { 
        flex: 1, 
        flexDirection: 'row', 
        backgroundColor: '#FEF2F2', 
        height: 50, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 8 
    },
    contactBtnText: { color: '#B62022', fontSize: 15, fontWeight: '800' },
});

export default ContactBar;
