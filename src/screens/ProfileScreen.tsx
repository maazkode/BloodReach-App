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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { getUserDocument } from '../services/firestoreService';
import { UserDocument } from '../types/database';
import { signOut } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [userData, setUserData] = React.useState<UserDocument | null>(null);

  React.useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const data = await getUserDocument(user.uid);
      setUserData(data);
    };
    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const goHome = () => {
    if (userData?.lastActiveRole === 'donor') navigation.navigate('DonorDashboard');
    else navigation.navigate('RequesterDashboard');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcon name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <MaterialIcon name="settings" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
      >
        <View style={styles.profileTop}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: userData?.photoURL || 'https://i.pravatar.cc/200?u=bloodreach' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.avatarEditBtn}>
              <MaterialIcon name="edit" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.nameText}>{userData?.name || 'User'}</Text>
          <Text style={styles.emailText}>{user?.email || 'user@bloodreach.com'}</Text>

          <View style={styles.bloodPill}>
            <MaterialIcon name="water-drop" size={16} color="#FFFFFF" />
            <Text style={styles.bloodPillText}>{(userData?.bloodGroup || '--') + ' POSITIVE'}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>DONATIONS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>36L</Text>
            <Text style={styles.statLabel}>SAVED LIFE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>Gold</Text>
            <Text style={styles.statLabel}>BADGE</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <MenuRow icon="person" label="Personal Info" onPress={() => {}} />
          <MenuRow icon="history" label="Donation History" onPress={() => {}} />
          <MenuRow icon="edit" label="Edit Profile" onPress={() => {}} />
          <MenuRow icon="security" label="Security & Privacy" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuRow icon="logout" label="Logout" onPress={handleLogout} danger />
        </View>

        <View style={styles.referCard}>
          <Text style={styles.referTitle}>Refer a Donor</Text>
          <Text style={styles.referSub}>
            Invite friends to join BloodReach and save more lives together.
          </Text>
          <TouchableOpacity style={styles.inviteBtn}>
            <Text style={styles.inviteBtnText}>Invite Friends</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
        <TouchableOpacity style={styles.navItem} onPress={goHome}>
          <MaterialIcon name="home" size={26} color="#94A3B8" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcon name="water-drop" size={26} color="#94A3B8" />
          <Text style={styles.navText}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcon name="history" size={26} color="#94A3B8" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcon name="person" size={26} color="#DC2626" />
          <Text style={[styles.navText, { color: '#DC2626' }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MenuRow: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}> = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress}>
    <View style={[styles.menuIconBox, danger && styles.menuIconBoxDanger]}>
      <MaterialIcon name={icon as any} size={22} color={danger ? '#DC2626' : '#DC2626'} />
    </View>
    <Text style={[styles.menuLabel, danger && { color: '#DC2626' }]}>{label}</Text>
    <View style={{ flex: 1 }} />
    <MaterialIcon name="chevron-right" size={24} color={danger ? '#DC2626' : '#CBD5E1'} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10 },
  profileTop: { alignItems: 'center', paddingTop: 10, paddingBottom: 10 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#F1F5F9' },
  avatarEditBtn: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  nameText: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  emailText: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 12 },
  bloodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  bloodPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#DC2626', marginBottom: 6 },
  statLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.6 },
  statDivider: { width: 1, height: 42, backgroundColor: '#F1F5F9' },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 18,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconBoxDanger: { backgroundColor: '#FDECEC' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#334155' },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  referCard: {
    backgroundColor: '#DC2626',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#DC2626',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
  referTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  referSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', lineHeight: 18, marginBottom: 14 },
  inviteBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inviteBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '900' },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginTop: 4 },
});

export default ProfileScreen;

