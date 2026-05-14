import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PatientHeroCardProps {
    patientName: string;
    bloodGroup: string;
    unitsRequired: number;
    urgencyLevel: string;
    statusLabel?: string;
}

const PatientHeroCard = React.memo(({ 
    patientName, 
    bloodGroup, 
    unitsRequired, 
    urgencyLevel,
    statusLabel = 'Pending'
}: PatientHeroCardProps) => {
    const isUrgent = urgencyLevel === 'urgent' || urgencyLevel === 'critical';
    
    return (
        <View style={styles.patientHeroCard}>
            <View style={styles.patientHeroIdentity}>
                <View style={styles.patientNameContainer}>
                    <Text style={styles.patientLabel}>PATIENT NAME</Text>
                    <Text style={styles.patientNameHero} numberOfLines={2}>{patientName}</Text>
                    <View style={styles.urgencyBadgeHero}>
                        <MaterialCommunityIcon
                            name={isUrgent ? 'lightning-bolt' : 'clock-outline'}
                            size={14}
                            color={isUrgent ? '#B62022' : '#64748B'}
                        />
                        <Text style={[styles.urgencyTextHero, isUrgent && { color: '#B62022' }]}>
                            {isUrgent ? 'CRITICAL PRIORITY' : 'NORMAL PRIORITY'}
                        </Text>
                    </View>
                </View>

                <View style={styles.patientHeroBloodBadge}>
                    <View style={styles.bloodBadgeInner}>
                        <MaterialCommunityIcon name="water" size={24} color="#B62022" />
                        <Text style={styles.bloodBadgeValueHero}>{bloodGroup}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.patientHeroDivider} />

            <View style={styles.patientHeroStatsGrid}>
                <View style={styles.patientHeroStat}>
                    <Text style={styles.patientHeroStatValue}>{unitsRequired}</Text>
                    <Text style={styles.patientHeroStatLabel}>UNITS NEEDED</Text>
                </View>
                <View style={styles.patientHeroStatDivider} />
                <View style={styles.patientHeroStat}>
                    <Text style={styles.patientHeroStatValue}>{statusLabel}</Text>
                    <Text style={styles.patientHeroStatLabel}>STATUS</Text>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    patientHeroCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 20,
        marginTop: -40,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    patientHeroIdentity: { flexDirection: 'row', justifyContent: 'space-between' },
    patientNameContainer: { flex: 1, paddingRight: 15 },
    patientLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
    patientNameHero: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
    urgencyBadgeHero: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    urgencyTextHero: { fontSize: 11, fontWeight: '800', color: '#64748B', marginLeft: 4, letterSpacing: 0.5 },
    patientHeroBloodBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FDECEC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
    bloodBadgeInner: { alignItems: 'center' },
    bloodBadgeValueHero: { fontSize: 18, fontWeight: '900', color: '#B62022', marginTop: -2 },
    patientHeroDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
    patientHeroStatsGrid: { flexDirection: 'row', alignItems: 'center' },
    patientHeroStat: { flex: 1, alignItems: 'center' },
    patientHeroStatValue: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
    patientHeroStatLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginTop: 2, letterSpacing: 0.5 },
    patientHeroStatDivider: { width: 1, height: 30, backgroundColor: '#F1F5F9' },
});

export default PatientHeroCard;
