import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { Colors } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelection'>;

type RoleType = 'donor' | 'requester';

const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<RoleType>('donor');

  const handleContinue = () => {
    navigation.navigate('Auth', { role: selectedRole });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color={Colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BloodReach</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Continue As</Text>
          <Text style={styles.subtitle}>
            Please select your role to proceed
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          {/* Donate Blood */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.card,
              styles.cardTop,
              selectedRole === 'donor' && styles.cardSelected,
            ]}
            onPress={() => setSelectedRole('donor')}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconCircle, styles.iconCircleDonor]}>
                <MaterialIcon
                  name="favorite"
                  size={28}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Donate Blood</Text>
                <Text style={styles.cardDescription}>
                  Help save lives by donating to those in need
                </Text>
              </View>
              {selectedRole === 'donor' && (
                <View style={styles.checkWrapper}>
                  <MaterialIcon
                    name="check-circle"
                    size={22}
                    color={Colors.primary}
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Request Blood */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.card,
              selectedRole === 'requester' && styles.cardSelected,
            ]}
            onPress={() => setSelectedRole('requester')}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconCircle, styles.iconCircleRequester]}>
                <FAIcon
                  name="hospital-symbol"
                  size={26}
                  color={Colors.white}
                />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Request Blood</Text>
                <Text style={styles.cardDescription}>
                  Find compatible donors instantly for emergencies
                </Text>
              </View>
              {selectedRole === 'requester' && (
                <View style={styles.checkWrapper}>
                  <MaterialIcon
                    name="check-circle"
                    size={22}
                    color={Colors.primary}
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
          <MaterialIcon
            name="arrow-forward-ios"
            size={18}
            color={Colors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginRow}
          onPress={() => navigation.navigate('Auth', { role: selectedRole })}
        >
          <Text style={styles.loginQuestion}>Already have an account? </Text>
          <Text style={styles.loginLink}>Login</Text>
        </TouchableOpacity>

        <View style={styles.securityRow}>
          <MaterialIcon
            name="verified-user"
            size={14}
            color="rgba(148, 163, 184, 0.9)"
          />
          <Text style={styles.securityText}> SECURE HEALTH PORTAL</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  headerPlaceholder: {
    width: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
  },
  cardsContainer: {
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 4,
  },
  cardTop: {
    marginBottom: 18,
  },
  cardSelected: {
    borderColor: Colors.primary,
    shadowOpacity: 0.12,
    elevation: 6,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconCircleDonor: {
    backgroundColor: Colors.donorLight,
  },
  iconCircleRequester: {
    backgroundColor: Colors.primary,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  checkWrapper: {
    marginLeft: 10,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 4,
    backgroundColor: Colors.background,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  continueText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  loginQuestion: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  securityText: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#9CA3AF',
  },
});

export default RoleSelectionScreen;


