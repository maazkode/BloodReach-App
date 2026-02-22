import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.userName}>Maaz Khan</Text>
                </View>
                <TouchableOpacity style={styles.profileButton}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/150?u=maaz' }}
                        style={styles.profileImage}
                    />
                    <View style={styles.notificationBadge} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusInfo}>
                        <Text style={styles.statusLabel}>Availability Status</Text>
                        <Text style={styles.statusValue}>Available to Donate</Text>
                    </View>
                    <TouchableOpacity style={styles.statusToggle}>
                        <View style={styles.toggleTrack}>
                            <View style={styles.toggleThumb} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FFEEF0' }]}>
                        <View style={[styles.actionIconContainer, { backgroundColor: Colors.primary }]}>
                            <MaterialIcon name="search" size={24} color="white" />
                        </View>
                        <Text style={styles.actionLabel}>Find Donors</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#F1F7FF' }]}>
                        <View style={[styles.actionIconContainer, { backgroundColor: '#2196F3' }]}>
                            <MaterialIcon name="add-alert" size={24} color="white" />
                        </View>
                        <Text style={styles.actionLabel}>Request Blood</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Requests */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Nearby Requests</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.requestCard}>
                    <View style={styles.bloodTypeContainer}>
                        <Text style={styles.bloodTypeText}>A+</Text>
                    </View>
                    <View style={styles.requestDetails}>
                        <Text style={styles.requestName}>City Hospital</Text>
                        <View style={styles.requestMeta}>
                            <MaterialIcon name="location-on" size={14} color="#94A3B8" />
                            <Text style={styles.metaText}>2.5 km away</Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaText}>Urgent</Text>
                        </View>
                    </View>
                    <MaterialIcon name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.requestCard}>
                    <View style={[styles.bloodTypeContainer, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.bloodTypeText, { color: '#2563EB' }]}>O-</Text>
                    </View>
                    <View style={styles.requestDetails}>
                        <Text style={styles.requestName}>St. Mary's Clinic</Text>
                        <View style={styles.requestMeta}>
                            <MaterialIcon name="location-on" size={14} color="#94A3B8" />
                            <Text style={styles.metaText}>4.8 km away</Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaText}>Today</Text>
                        </View>
                    </View>
                    <MaterialIcon name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Nav Placeholder */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="home" size={28} color={Colors.primary} />
                    <View style={styles.activeDot} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="explore" size={28} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="history" size={28} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcon name="person" size={28} color="#94A3B8" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    welcomeText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 2,
    },
    profileButton: {
        position: 'relative',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#E2E8F0',
    },
    notificationBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: 'white',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    statusCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 4,
        marginBottom: 30,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    statusToggle: {
        width: 50,
        height: 28,
    },
    toggleTrack: {
        width: '100%',
        height: '100%',
        backgroundColor: '#DEF7ED',
        borderRadius: 14,
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.success,
        alignSelf: 'flex-end',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    viewAllText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    actionCard: {
        width: '48%',
        borderRadius: 22,
        padding: 20,
        alignItems: 'center',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    requestCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    bloodTypeContainer: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#FDECEC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    bloodTypeText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.primary,
    },
    requestDetails: {
        flex: 1,
    },
    requestName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    requestMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 13,
        color: '#94A3B8',
        marginLeft: 4,
    },
    metaDot: {
        fontSize: 13,
        color: '#CBD5E1',
        marginHorizontal: 8,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        height: 70,
        backgroundColor: 'white',
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.primary,
        marginTop: 4,
    },
});

export default HomeScreen;
