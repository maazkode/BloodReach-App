import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

interface RequestSummaryCardProps {
    patientName: string;
    bloodGroup: string;
    unitsRequired: number;
    urgencyLevel: string;
    hospitalName: string;
    hospitalAddress: string;
    city: string;
    distance?: number;
    matchedDonorsCount?: number;
    postedAt?: string;
    onGetDirections?: () => void;
    phone?: string;
}

const RequestSummaryCard: React.FC<RequestSummaryCardProps> = ({
    patientName,
    bloodGroup,
    unitsRequired,
    urgencyLevel,
    hospitalName,
    hospitalAddress,
    city,
    distance,
    matchedDonorsCount,
    postedAt,
    onGetDirections,
    phone,
}) => {
    const isUrgent = urgencyLevel === 'urgent';

    return (
        <View style={styles.card}>
            {/* Top Header: Patient & Urgency */}
            <LinearGradient
                colors={isUrgent ? ['#B62022', '#991B1B'] : ['#64748B', '#475569']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerInfo}>
                    <Text style={styles.patientNameLabel}>PATIENT NAME</Text>
                    <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
                </View>
                <View style={styles.urgencyPill}>
                    <MaterialCommunityIcon 
                        name={isUrgent ? "fire" : "clock-outline"} 
                        size={12} 
                        color={isUrgent ? '#B62022' : '#475569'} 
                    />
                    <Text style={[styles.urgencyText, { color: isUrgent ? '#B62022' : '#475569' }]}>
                        {urgencyLevel.toUpperCase()}
                    </Text>
                </View>
            </LinearGradient>

            <View style={styles.mainContent}>
                {/* Stats Section */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                            <MaterialCommunityIcon name="water" size={20} color="#B62022" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Blood Group</Text>
                            <Text style={styles.statValue}>{bloodGroup}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                            <MaterialCommunityIcon name="flask-outline" size={20} color="#B62022" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Units Needed</Text>
                            <Text style={styles.statValue}>{unitsRequired}</Text>
                        </View>
                    </View>
                </View>

                {/* Meta Info Row */}
                <View style={styles.metaRow}>
                    {postedAt && (
                        <View style={styles.metaItem}>
                            <MaterialIcon name="access-time" size={14} color="#94A3B8" />
                            <Text style={styles.metaText}>{postedAt}</Text>
                        </View>
                    )}
                    {matchedDonorsCount !== undefined && (
                        <View style={styles.metaItem}>
                            <MaterialIcon name="group" size={14} color="#94A3B8" />
                            <Text style={styles.metaText}>{matchedDonorsCount} responses</Text>
                        </View>
                    )}
                    {distance !== undefined && (
                        <View style={styles.metaItem}>
                            <MaterialIcon name="near-me" size={14} color="#94A3B8" />
                            <Text style={styles.metaText}>{distance} km</Text>
                        </View>
                    )}
                </View>

                {/* Contact Information */}
                {phone && (
                    <View style={styles.contactCard}>
                        <View style={styles.contactIconBg}>
                            <MaterialIcon name="phone" size={20} color="#16A34A" />
                        </View>
                        <View style={styles.contactTextContent}>
                            <Text style={styles.contactLabel}>Contact Phone</Text>
                            <Text style={styles.contactValue}>{phone}</Text>
                        </View>
                    </View>
                )}

                {/* Hospital Information */}
                <View style={styles.hospitalCard}>
                    <View style={styles.hospitalMain}>
                        <View style={styles.hospitalIconBg}>
                            <MaterialIcon name="local-hospital" size={22} color="#B62022" />
                        </View>
                        <View style={styles.hospitalTextContent}>
                            <Text style={styles.hospitalName} numberOfLines={1}>{hospitalName}</Text>
                            <Text style={styles.hospitalAddress} numberOfLines={2}>
                                {hospitalAddress}, {city}
                            </Text>
                        </View>
                    </View>

                    {onGetDirections && (
                        <TouchableOpacity style={styles.directionsAction} onPress={onGetDirections}>
                            <LinearGradient
                                colors={['#B62022', '#E11D48']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.directionsBtnGradient}
                            >
                                <MaterialIcon name="directions" size={18} color="#FFFFFF" />
                                <Text style={styles.directionsBtnText}>Get Directions</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#B62022',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 5,
    },
    headerGradient: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    patientNameLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
        marginBottom: 2,
    },
    patientName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    urgencyPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    urgencyText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    mainContent: {
        padding: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    contactIconBg: {
        width: 36,
        height: 36,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    contactTextContent: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 12,
        color: '#16A34A',
        fontWeight: '600',
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#14532D',
    },
    hospitalCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    hospitalMain: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    hospitalIconBg: {
        width: 44,
        height: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    hospitalTextContent: {
        flex: 1,
    },
    hospitalName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    hospitalAddress: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    directionsAction: {
        width: '100%',
    },
    directionsBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    directionsBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

export default RequestSummaryCard;
