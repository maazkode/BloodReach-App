import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { UserDocument } from '../../types/database';

interface HeroProps {
    userData: UserDocument | null;
    styles: any;
    onSchedulePress?: () => void;
    isAvailableNow?: boolean;
}

export const RestrictedHero: React.FC<HeroProps> = ({ userData, styles }) => (
    <View style={[styles.heroCard, styles.heroCardRestricted]}>
        <View style={styles.unifiedCardTop}>
            <View style={styles.bloodBadge}>
                <Text style={styles.bloodBadgeText}>{userData?.bloodGroup || '--'}</Text>
            </View>
            <View style={styles.eligiblePillRestricted}>
                <MaterialIcon name="error-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.eligiblePillText}>RESTRICTED</Text>
            </View>
        </View>
        <Text style={styles.unifiedTitleLarge}>Medical Restriction</Text>
        <Text style={styles.unifiedSubtextLight}>
            {userData?.age! < 18
                ? "You're a bit too young to donate yet. You'll be ready once you're 18!"
                : "Donating after 60 requires specific medical conditions. Please consult a doctor."}
        </Text>
    </View>
);

export const CooldownHero: React.FC<HeroProps> = ({ userData, styles }) => (
    <View style={[styles.heroCard, styles.heroCardCooldown]}>
        <View style={styles.unifiedCardTop}>
            <View style={styles.bloodBadge}>
                <Text style={styles.bloodBadgeText}>{userData?.bloodGroup || 'A+'}</Text>
            </View>
            <View style={[styles.eligiblePill, styles.cooldownPill]}>
                <View style={[styles.dot, styles.redDot]} />
                <Text style={styles.eligiblePillText}>RECOVERY MODE</Text>
            </View>
        </View>
        <Text style={styles.unifiedTitleLarge}>Take Rest & Recover</Text>
        <Text style={styles.unifiedSubtextLight}>
            Eligible again after {userData?.donationCooldownUntil ? (userData.donationCooldownUntil as any).toDate().toLocaleDateString() : 'cooldown'}
        </Text>
    </View>
);

export const ActiveHero: React.FC<HeroProps> = ({ userData, styles, onSchedulePress, isAvailableNow = true }) => {
    if (!isAvailableNow) {
        return (
            <View style={[styles.heroCard, styles.heroCardResting]}>
                <View style={styles.unifiedCardTop}>
                    <View style={styles.bloodBadge}>
                        <Text style={styles.bloodBadgeText}>{userData?.bloodGroup || 'A+'}</Text>
                    </View>
                    <View style={[styles.eligiblePill, styles.restingPill]}>
                        <View style={[styles.dot, styles.amberDot]} />
                        <Text style={styles.eligiblePillText}>RESTING MODE</Text>
                    </View>
                </View>
                <Text style={styles.unifiedTitleLarge}>Off-Duty / Resting</Text>
                <Text style={styles.unifiedSubtextLight}>
                    You are outside your availability hours. Matching notifications are paused.
                </Text>
                <TouchableOpacity style={styles.heroActionBtn} activeOpacity={0.8} onPress={onSchedulePress}>
                    <MaterialIcon name="event-available" size={18} color="#475569" />
                    <Text style={[styles.heroActionBtnText, { color: '#475569' }]}>Update Schedule</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.heroCard}>
            <View style={styles.unifiedCardTop}>
                <View style={styles.bloodBadge}>
                    <Text style={styles.bloodBadgeText}>{userData?.bloodGroup || 'A+'}</Text>
                </View>
                <View style={styles.eligiblePill}>
                    <View style={[styles.dot, styles.greenDot]} />
                    <Text style={styles.eligiblePillText}>
                        {userData?.isAvailable ? 'ACTIVE' : 'OFFLINE'}
                    </Text>
                </View>
            </View>
            <Text style={styles.unifiedTitleLarge}>Ready to Save Lives</Text>
            <Text style={styles.unifiedSubtextLight}>Your donation can save up to 3 lives.</Text>
            <TouchableOpacity style={styles.heroActionBtn} activeOpacity={0.8} onPress={onSchedulePress}>
                <MaterialIcon name="event-available" size={18} color="#B62022" />
                <Text style={styles.heroActionBtnText}>Schedule a Donation</Text>
            </TouchableOpacity>
        </View>
    );
};
