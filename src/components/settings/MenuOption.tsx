import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MenuOptionProps {
    icon: string;
    title: string;
    color?: string;
    onPress: () => void;
    isLast?: boolean;
    rightText?: string | React.ReactNode;
}

const MenuOption = React.memo(({ icon, title, color = "#1E293B", onPress, isLast = false, rightText }: MenuOptionProps) => (
    <TouchableOpacity
        style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.menuIconBox, { backgroundColor: `${color}10` }]}>
            <MaterialCommunityIcon name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.menuTitle, { color }]}>{title}</Text>
        {rightText && (
            typeof rightText === 'string' ? (
                <Text style={styles.rightText}>{rightText}</Text>
            ) : (
                <View style={{ marginRight: 10 }}>{rightText}</View>
            )
        )}
        <MaterialIcon name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
));

const styles = StyleSheet.create({
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTitle: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '700' },
    rightText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#B62022',
        marginRight: 10,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
});

export default MenuOption;
