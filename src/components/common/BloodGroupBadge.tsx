import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BloodGroupBadgeProps {
    group: string;
    label?: string;
    size?: 'small' | 'large';
    style?: ViewStyle;
    inverted?: boolean;
}

const BloodGroupBadge = React.memo(({ 
    group, 
    label, 
    size = 'large', 
    style,
    inverted = false
}: BloodGroupBadgeProps) => {
    const isLarge = size === 'large';
    
    return (
        <View style={[
            styles.container, 
            isLarge ? styles.containerLarge : styles.containerSmall,
            inverted && styles.containerInverted,
            style
        ]}>
            <Text style={[
                styles.groupText, 
                isLarge ? styles.groupTextLarge : styles.groupTextSmall,
                inverted && styles.textInverted
            ]}>
                {group}
            </Text>
            {label && (
                <Text style={[
                    styles.label, 
                    isLarge ? styles.labelLarge : styles.labelSmall,
                    inverted && styles.textInverted
                ]}>
                    {label}
                </Text>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    containerLarge: {
        width: 55,
        height: 55,
        borderRadius: 16,
    },
    containerSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
    },
    containerInverted: {
        backgroundColor: '#B62022',
        borderColor: '#B62022',
    },
    groupText: {
        fontWeight: '900',
        color: '#E11D48',
    },
    groupTextLarge: {
        fontSize: 22,
        lineHeight: 24,
    },
    groupTextSmall: {
        fontSize: 14,
    },
    label: {
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    labelLarge: {
        fontSize: 9,
        marginTop: -1,
    },
    labelSmall: {
        fontSize: 9,
        marginLeft: 4,
    },
    textInverted: {
        color: 'white',
    }
});

export default BloodGroupBadge;
