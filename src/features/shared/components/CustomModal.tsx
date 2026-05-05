import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface CustomModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    description: string;
    icon?: string;
    iconColor?: string;
    primaryText?: string;
    onPrimaryPress?: () => void;
    secondaryText?: string;
    onSecondaryPress?: () => void;
    type?: 'info' | 'success' | 'error' | 'warning' | 'danger';
}

const CustomModal: React.FC<CustomModalProps> = ({
    visible,
    onClose,
    title,
    description,
    icon,
    iconColor,
    primaryText,
    onPrimaryPress,
    secondaryText,
    onSecondaryPress,
    type = 'info',
}) => {
    const [animation] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.spring(animation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();
        } else {
            animation.setValue(0);
        }
    }, [visible]);

    const getTypeColor = () => {
        switch (type) {
            case 'success': return '#10B981';
            case 'error':
            case 'danger': return '#EF4444';
            case 'warning': return '#F59E0B';
            default: return Colors.primary;
        }
    };

    const getTypeIcon = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error':
            case 'danger': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    };

    const activeIcon = icon || getTypeIcon();
    const activeIconColor = iconColor || getTypeColor();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            transform: [
                                {
                                    scale: animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1],
                                    }),
                                },
                            ],
                            opacity: animation,
                        },
                    ]}
                >
                    <View style={[styles.iconContainer, { backgroundColor: `${activeIconColor}15` }]}>
                        <MaterialIcon name={activeIcon} size={32} color={activeIconColor} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>

                    <View style={styles.footer}>
                        {secondaryText && (
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={onSecondaryPress || onClose}
                            >
                                <Text style={styles.secondaryText}>{secondaryText}</Text>
                            </TouchableOpacity>
                        )}

                        {primaryText && (
                            <TouchableOpacity
                                style={[
                                    styles.primaryBtn,
                                    { backgroundColor: type === 'danger' ? '#EF4444' : Colors.primary }
                                ]}
                                onPress={onPrimaryPress || onClose}
                            >
                                <Text style={styles.primaryText}>{primaryText}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    footer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    primaryBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    primaryText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    secondaryText: {
        color: '#64748B',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default CustomModal;
