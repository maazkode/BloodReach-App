import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface ScreenHeaderProps {
    title: string;
    onBack: () => void;
    topInset: number;
    rightElement?: React.ReactNode;
}

const ScreenHeader = React.memo(({ title, onBack, topInset, rightElement }: ScreenHeaderProps) => (
    <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <MaterialIcon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rightContainer}>
            {rightElement || <View style={{ width: 40 }} />}
        </View>
    </View>
));

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: 'white',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: { 
        fontSize: 18, 
        fontWeight: '800', 
        color: '#1E293B',
        textAlign: 'center',
        flex: 1
    },
    rightContainer: {
        width: 40,
        alignItems: 'flex-end'
    }
});

export default ScreenHeader;
