import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { UserDocument } from '../../types/database';
import BloodGroupBadge from '../common/BloodGroupBadge';

interface ProfileHeaderCardProps {
    userData: UserDocument | null;
    userEmail?: string | null;
}

const ProfileHeaderCard = ({ userData, userEmail }: ProfileHeaderCardProps) => {
    return (
        <View style={styles.profileHeaderCard}>
            <View style={styles.profileIdentityRow}>
                <View style={styles.avatarContainer}>
                    {userData?.photoURL ? (
                        <Image source={{ uri: userData.photoURL }} style={styles.mainAvatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <MaterialIcon name="person" size={40} color="white" />
                        </View>
                    )}
                    <View style={styles.verifiedBadge}>
                        <MaterialIcon name="verified" size={16} color="white" />
                    </View>
                </View>
                <View style={styles.identityTextContainer}>
                    <Text style={styles.userNameText}>{userData?.name || 'User Name'}</Text>
                    <Text style={styles.userEmailText}>{userEmail}</Text>
                    <BloodGroupBadge
                        group={userData?.bloodGroup || '--'}
                        size="small"
                        style={styles.bloodBadgeSmall}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    profileHeaderCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    profileIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    mainAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#F8FAFC' },
    avatarPlaceholder: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#B62022',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#F8FAFC'
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3B82F6',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    identityTextContainer: {
        marginLeft: 18,
        flex: 1,
    },
    userNameText: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
    userEmailText: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
    bloodBadgeSmall: {
        marginTop: 8,
    },
});

export default ProfileHeaderCard;
