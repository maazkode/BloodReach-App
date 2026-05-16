import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface RequestSummaryCardProps {
    patientName: string;
    bloodGroup: string;
    unitsRequired: number;
    urgencyLevel: string;
    hospitalName: string;
    hospitalAddress: string;
    city: string;
    onGetDirections: () => void;
}

const RequestSummaryCard: React.FC<RequestSummaryCardProps> = ({
    patientName,
    bloodGroup,
    unitsRequired,
    urgencyLevel,
    hospitalName,
    hospitalAddress,
    city,
    onGetDirections,
}) => {
    const isUrgent = urgencyLevel === 'urgent';

    return (
        <View style={styles.card}>
            {/* Top: patient name + status badge */}
            <View style={styles.header}>
                <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
                <View style={[styles.badge, isUrgent ? styles.badgeUrgent : styles.badgeNormal]}>
                    <Text style={[styles.badgeText, isUrgent ? styles.badgeTextUrgent : styles.badgeTextNormal]}>
                        {isUrgent ? 'EMERGENCY' : 'NORMAL'}
                    </Text>
                </View>
            </View>

            {/* Middle: Blood Group & Units stat boxes */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Blood Group</Text>
                    <Text style={styles.bloodGroupText}>{bloodGroup}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Units Required</Text>
                    <Text style={styles.unitsText}>{unitsRequired}</Text>
                </View>
            </View>

            {/* Bottom: hospital info + directions button */}
            <View style={styles.hospitalContainer}>
                <View style={styles.hospitalInfo}>
                    <MaterialIcon name="local-hospital" size={20} color="#64748B" style={styles.hospitalIcon} />
                    <View style={styles.hospitalTextContainer}>
                        <Text style={styles.hospitalName} numberOfLines={1}>{hospitalName}</Text>
                        <Text style={styles.hospitalAddress} numberOfLines={2}>
                            {hospitalAddress}, {city}
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity style={styles.directionsBtn} onPress={onGetDirections}>
                    <MaterialIcon name="directions" size={18} color="#B62022" />
                    <Text style={styles.directionsBtnText}>Get Directions</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    patientName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
        marginRight: 12,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeUrgent: {
        backgroundColor: '#FEE2E2',
    },
    badgeNormal: {
        backgroundColor: '#DCFCE7',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    badgeTextUrgent: {
        color: '#B62022',
    },
    badgeTextNormal: {
        color: '#166534',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        width: 1,
        backgroundColor: '#FCA5A5',
        marginHorizontal: 16,
    },
    statLabel: {
        fontSize: 12,
        color: '#991B1B',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bloodGroupText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#B62022',
    },
    unitsText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#B62022',
    },
    hospitalContainer: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 16,
    },
    hospitalInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    hospitalIcon: {
        marginTop: 2,
        marginRight: 12,
    },
    hospitalTextContainer: {
        flex: 1,
    },
    hospitalName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 4,
    },
    hospitalAddress: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    directionsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF1F2',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    directionsBtnText: {
        color: '#B62022',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default RequestSummaryCard;
