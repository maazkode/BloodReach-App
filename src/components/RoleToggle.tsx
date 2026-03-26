import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const TOGGLE_WIDTH = width * 0.8;
const INDICATOR_WIDTH = TOGGLE_WIDTH / 2;

interface RoleToggleProps {
  initialRole?: 'donor' | 'requester';
  onRoleChange: (role: 'donor' | 'requester') => void;
}

/**
 * A modern, animated sliding toggle for Role Selection (Donor/Recipient).
 * Uses React Native's Animated API for smooth transitions.
 */
const RoleToggle: React.FC<RoleToggleProps> = ({ initialRole = 'requester', onRoleChange }) => {
  const [activeRole, setActiveRole] = useState<'donor' | 'requester'>(initialRole);
  
  // Animation value: 0 for left (Donor), 1 for right (Recipient)
  // Note: Standard logic often has Donor on left, Recipient on right
  const translateX = useRef(new Animated.Value(initialRole === 'donor' ? 0 : 1)).current;

  // Track initial set to ensure alignment
  useEffect(() => {
    setActiveRole(initialRole);
    Animated.spring(translateX, {
      toValue: initialRole === 'donor' ? 0 : 1,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [initialRole]);

  const handleToggle = (role: 'donor' | 'requester') => {
    if (role === activeRole) return;

    setActiveRole(role);
    
    // Animate the sliding indicator
    Animated.spring(translateX, {
      toValue: role === 'donor' ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    // Trigger callback
    onRoleChange(role);
  };

  const animatedStyle = {
    transform: [
      {
        translateX: translateX.interpolate({
          inputRange: [0, 1],
          outputRange: [4, INDICATOR_WIDTH - 4], // 4px padding
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleTrack}>
        {/* Animated Sliding Highlight */}
        <Animated.View style={[styles.indicator, animatedStyle]} />

        {/* Buttons overlaying the track */}
        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.8}
          onPress={() => handleToggle('donor')}
        >
          <Text
            style={[
              styles.optionText,
              activeRole === 'donor' && styles.activeText,
            ]}
          >
            Donor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.8}
          onPress={() => handleToggle('requester')}
        >
          <Text
            style={[
              styles.optionText,
              activeRole === 'requester' && styles.activeText,
            ]}
          >
            Recipient
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '100%',
  },
  toggleTrack: {
    width: TOGGLE_WIDTH,
    height: 54,
    backgroundColor: '#F1F5F9', // Soft background gray
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  indicator: {
    position: 'absolute',
    width: INDICATOR_WIDTH - 4, // Adjust for padding
    height: 46,
    backgroundColor: Colors.primary, // Red/Blue for active state
    borderRadius: 23,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  option: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure text is touchable and visible over indicator
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B', // Inactive color
  },
  activeText: {
    color: '#FFFFFF', // Active text color
  },
});

export default RoleToggle;
