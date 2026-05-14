import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

interface InfoRowProps {
    icon: string;
    iconLib?: 'community' | 'material';
    label: string;
    value: string | number;
    iconBg: string;
    iconColor: string;
    isLast?: boolean;
}

const InfoRow = React.memo(({ icon, iconLib = 'community', label, value, iconBg, iconColor, isLast }: InfoRowProps) => (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
        <View style={[styles.infoIconBox, { backgroundColor: iconBg }]}>
            {iconLib === 'material' ? (
                <MaterialIcon name={icon} size={20} color={iconColor} />
            ) : (
                <MaterialCommunityIcon name={icon} size={20} color={iconColor} />
            )}
        </View>
        <View style={styles.infoText}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
));

const styles = StyleSheet.create({
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    infoRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    infoIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoText: { flex: 1 },
    infoLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
});

export default InfoRow;
