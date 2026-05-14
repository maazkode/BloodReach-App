import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface BadgeProps {
    label: string;
    icon?: string;
    bgColor?: string;
    textColor?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

const Badge = React.memo(({ 
    label, 
    icon, 
    bgColor = '#F1F5F9', 
    textColor = '#64748B',
    style,
    textStyle 
}: BadgeProps) => (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
        {icon && <MaterialIcon name={icon} size={12} color={textColor} style={styles.icon} />}
        <Text style={[styles.badgeText, { color: textColor }, textStyle]}>{label}</Text>
    </View>
));

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    icon: { marginRight: 4 },
    badgeText: { 
        fontSize: 10, 
        fontWeight: '800', 
        textTransform: 'uppercase' 
    },
});

export default Badge;
