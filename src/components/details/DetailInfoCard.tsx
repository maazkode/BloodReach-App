import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface DetailInfoCardProps {
    title?: string;
    icon?: string;
    imageUri?: string | null;
    mainText: string;
    subText: string;
    rightElement?: React.ReactNode;
    children?: React.ReactNode;
    style?: ViewStyle;
}

const DetailInfoCard = React.memo(({ 
    title, 
    icon, 
    imageUri, 
    mainText, 
    subText, 
    rightElement, 
    children,
    style
}: DetailInfoCardProps) => (
    <View style={[styles.section, style]}>
        {title && <Text style={styles.sectionTitleSmall}>{title}</Text>}
        <View style={styles.card}>
            <View style={styles.infoRow}>
                <View style={styles.iconBox}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.avatarImage} />
                    ) : (
                        <MaterialIcon name={icon || 'person'} size={24} color={imageUri === null ? "#94A3B8" : "#B62022"} />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.mainText} numberOfLines={1}>{mainText}</Text>
                    <Text style={styles.subText}>{subText}</Text>
                </View>
                {rightElement}
            </View>
            {children}
        </View>
    </View>
));

const styles = StyleSheet.create({
    section: { marginBottom: 24 },
    sectionTitleSmall: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        marginBottom: 10,
        marginLeft: 4,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    avatarImage: { width: '100%', height: '100%' },
    textContainer: { flex: 1, marginLeft: 12 },
    mainText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    subText: { fontSize: 13, color: '#64748B', marginTop: 2 },
});

export default DetailInfoCard;
