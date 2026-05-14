import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DonationRequest } from '../../types/database';
import { getTimeAgo, getUrgencyText } from '../../utility/formatters';
import PulseIndicator from './PulseIndicator';
import Badge from '../common/Badge';
import BloodGroupBadge from '../common/BloodGroupBadge';

interface RequestItemProps {
    item: DonationRequest;
    isFullWidth?: boolean;
    isEligible: boolean;
    onHelpPress: (item: DonationRequest) => void;
    eligibilityDate?: string;
}

const RequestItem = React.memo(({ item, isFullWidth, isEligible, onHelpPress, eligibilityDate }: RequestItemProps) => {
    const isUrgent = item.urgencyLevel === 'urgent' || item.urgencyLevel === 'critical';
    const urgencyColor = isUrgent ? '#E11D48' : '#D97706';
    const urgencyBg = isUrgent ? '#FFF1F2' : '#FEF3C7';
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[isFullWidth ? styles.newCardFull : styles.newCardHorizontal, isUrgent && styles.urgentCardBorder]}
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onHelpPress(item)}
            >
                <View style={styles.cardHeader}>
                    <BloodGroupBadge group={item.bloodGroup} label="Needed" />
                    <View style={styles.headerRight}>
                        <Badge 
                            label={item.urgencyLevel?.toUpperCase() || ''}
                            icon="bolt"
                            bgColor={urgencyBg}
                            textColor={urgencyColor}
                            style={styles.urgencyBadge}
                        />
                        <Text style={styles.postedTime}>{getTimeAgo(item.createdAt)}</Text>
                    </View>
                </View>

                {isUrgent && (
                    <View style={styles.emergencyIndicator}>
                        <PulseIndicator />
                        <View style={styles.emergencyDot} />
                    </View>
                )}

                <View style={styles.cardBody}>
                    <Text style={styles.patientName} numberOfLines={1}>{item.patientName}</Text>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcon name="hospital-building" size={14} color="#64748B" />
                        <Text style={styles.infoText} numberOfLines={1}>{item.hospitalName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcon name="clock-outline" size={14} color={urgencyColor} />
                        <Text style={styles.urgencyDetail}>{getUrgencyText(item.urgencyLevel || 'normal')}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.metricsRow}>
                        <View style={styles.metric}>
                            <MaterialIcon name="water-drop" size={14} color="#E11D48" />
                            <Text style={styles.metricText}>{item.unitsRequired} Units</Text>
                        </View>
                    </View>

                    <View style={styles.eligibilityContainer}>
                        {isEligible ? (
                            <View style={styles.eligibleBadge}>
                                <MaterialIcon name="check-circle" size={14} color="#059669" />
                                <Text style={styles.eligibleText}>Eligible</Text>
                            </View>
                        ) : (
                            <View style={styles.ineligibleBadge}>
                                <MaterialIcon name="info" size={14} color="#94A3B8" />
                                <Text style={styles.ineligibleText}>Wait until {eligibilityDate}</Text>
                            </View>
                        )}
                    </View>
                    <MaterialIcon name="chevron-right" size={20} color="#CBD5E1" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    newCardHorizontal: {
        width: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 10,
        marginRight: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    newCardFull: {
        marginHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    urgentCardBorder: {
        borderLeftWidth: 6,
        borderLeftColor: '#E11D48',
        backgroundColor: '#FFF5F5',
    },
    emergencyIndicator: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emergencyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E11D48',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    urgencyBadge: {
        marginBottom: 4,
    },
    postedTime: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    cardBody: {
        marginBottom: 8,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        gap: 6,
    },
    infoText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
        flex: 1,
    },
    urgencyDetail: {
        fontSize: 12,
        color: '#E11D48',
        fontWeight: '700',
    },
    metricsRow: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 16,
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 4,
    },
    eligibilityContainer: {
        flex: 1,
    },
    eligibleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eligibleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },
    ineligibleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ineligibleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
});

export default RequestItem;
