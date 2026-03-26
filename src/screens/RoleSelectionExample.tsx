import React, { useState } from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoleToggle from '../components/RoleToggle';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelectionExample'>;

const RoleSelectionExample: React.FC<Props> = ({ navigation }) => {
  const [role, setRole] = useState<'donor' | 'requester'>('requester');

  const handleRoleChange = (newRole: 'donor' | 'requester') => {
    setRole(newRole);
    // Add logic for delayed navigation to allow animation to finish
    setTimeout(() => {
        if (newRole === 'donor') {
            navigation.navigate('DonorDashboard');
        } else {
            navigation.navigate('RequesterDashboard');
        }
    }, 400); // 400ms buffer for toggle animation
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
            <MaterialIcon 
                name={role === 'donor' ? "volunteer-activism" : "bloodtype"} 
                size={60} 
                color={Colors.primary} 
            />
        </View>
        
        <Text style={styles.title}>Switch Experience</Text>
        <Text style={styles.subtitle}>
          Choose your mode to proceed. You can always switch back later in your profile.
        </Text>

        {/* The Custom Reusable RoleToggle Component */}
        <RoleToggle 
            initialRole={role} 
            onRoleChange={handleRoleChange} 
        />

        <View style={styles.infoBox}>
            <MaterialIcon name="info" size={20} color="#64748B" />
            <Text style={styles.infoText}>
                {role === 'donor' 
                    ? "As a donor, you will see blood requests nearby." 
                    : "As a recipient, you can find and request blood fast."}
            </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#FDECEC',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 10,
    fontWeight: '500',
    flexShrink: 1,
  },
});

export default RoleSelectionExample;
