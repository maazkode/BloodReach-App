import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { DonationRequest } from '../../types/database';
import StatusBadge from './StatusBadge';
import BloodGroupBadge from '../common/BloodGroupBadge';

interface RequestCardProps {
    item: DonationRequest;
    onPress: (item: DonationRequest) => void;
}

const RequestCard = React.memo(({ item, onPress }: RequestCardProps) => (
    <TouchableOpacity
        activeOpacity={0.8}
        style={styles.requestCard}
        onPress={() => onPress(item)}
    >
        <View style={styles.cardMain}>
            <BloodGroupBadge 
                group={item.bloodGroup} 
                size="large" 
                inverted={item.status !== 'completed'} 
                style={styles.bloodBadge}
            />

            <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                    <Text style={styles.requestTitle} numberOfLines={1}>{item.patientName}</Text>
                    <Text style={styles.timeText}>Recently</Text>
                </View>
                <Text style={styles.requestSub} numberOfLines={1}>
                    {item.unitsRequired} Unit{item.unitsRequired > 1 ? 's' : ''} <Text style={styles.bullet}>•</Text> {item.hospitalName}
                </Text>
                <View style={styles.badgeRow}>
                    {item.urgencyLevel === 'urgent' && <StatusBadge status="EMERGENCY" />}
                    {item.status === 'open' && <StatusBadge status="WAITING" />}
                    {item.status === 'matched' && <StatusBadge status="MATCHED" />}
                    {item.status === 'completed' && <StatusBadge status="CLOSED" />}
                </View>
            </View>
        </View>

        <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
                {item.matchedDonorIds && item.matchedDonorIds.length > 0 ? (
                    <View style={styles.matchesRow}>
                        <View style={styles.matchCircle}><Text style={styles.matchText}>{item.matchedDonorIds.length}</Text></View>
                        <Text style={styles.matchLabel}>Donor{item.matchedDonorIds.length > 1 ? 's' : ''} Found</Text>
                    </View>
                ) : item.status === 'completed' ? (
                    <Text style={[styles.matchLabel, { marginLeft: 0 }]}>Request Fulfilled</Text>
                ) : (
                    <View style={styles.infoRow}>
                        <View style={styles.greenDot} />
                        <Text style={styles.infoText}>Searching for donors...</Text>
                    </View>
                )}
            </View>

            <View style={styles.footerRight}>
                <Text style={[
                    styles.viewDetailsText,
                    item.status === 'completed' && styles.viewDetailsTextOutline
                ]}>View Details</Text>
                <MaterialIcon
                    name="chevron-right"
                    size={20}
                    color={item.status === 'completed' ? '#94A3B8' : '#B62022'}
                />
            </View>
        </View>
    </TouchableOpacity>
));

const styles = StyleSheet.create({
    requestCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#64748B',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 20,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F8FAFC',
    },
    cardMain: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    bloodBadge: {
        marginRight: 12,
        marginTop: 2,
    },
    cardInfo: { flex: 1 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    requestTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', flex: 1, marginRight: 10 },
    timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    requestSub: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 10 },
    bullet: { marginHorizontal: 6, color: '#CBD5E1' },
    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerLeft: { flex: 1 },
    footerRight: { flexDirection: 'row', alignItems: 'center' },
    matchesRow: { flexDirection: 'row', alignItems: 'center' },
    matchCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    matchText: { fontSize: 11, fontWeight: '800', color: '#1E293B' },
    matchLabel: { marginLeft: 10, fontSize: 13, color: '#64748B', fontWeight: '600' },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
    infoText: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
    viewDetailsText: { color: '#B62022', fontWeight: '700', fontSize: 14, marginRight: 2 },
    viewDetailsTextOutline: { color: '#94A3B8' },
});

export default RequestCard;
