import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabItem = {
    key: string;
    label: string;
    icon: string;
    activeIcon?: string;
    onPress?: () => void;
    isFab?: boolean; // center floating action button
};

type Props = {
    tabs: TabItem[];
    activeTab: string;
};

const BottomTabBar: React.FC<Props> = ({ tabs, activeTab }) => {
    const insets = useSafeAreaInsets();
    const scaleAnims = React.useRef(tabs.map(() => new Animated.Value(1))).current;

    const handlePress = (index: number, tab: TabItem) => {
        // Bounce animation on press
        Animated.sequence([
            Animated.timing(scaleAnims[index], { toValue: 0.85, duration: 80, useNativeDriver: true }),
            Animated.spring(scaleAnims[index], { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();

        tab.onPress?.();
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
            {tabs.map((tab, index) => {
                const isActive = activeTab === tab.key;

                if (tab.isFab) {
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            activeOpacity={0.8}
                            onPress={() => handlePress(index, tab)}
                            style={styles.fabWrapper}
                        >
                            <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnims[index] }] }]}>
                                <MaterialIcon name={tab.icon} size={28} color="#fff" />
                            </Animated.View>
                            <Text style={styles.fabLabel}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                }

                return (
                    <TouchableOpacity
                        key={tab.key}
                        activeOpacity={0.7}
                        style={styles.tab}
                        onPress={() => handlePress(index, tab)}
                    >
                        <Animated.View style={[
                            styles.iconWrap,
                            isActive && styles.iconWrapActive,
                            { transform: [{ scale: scaleAnims[index] }] }
                        ]}>
                            <MaterialIcon
                                name={isActive ? (tab.activeIcon || tab.icon) : tab.icon}
                                size={22}
                                color={isActive ? '#B62022' : '#94A3B8'}
                            />
                        </Animated.View>
                        <Text style={[styles.label, isActive && styles.labelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 10,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrap: {
        width: 42,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 2,
    },
    iconWrapActive: {
        backgroundColor: '#FEE2E2',
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    labelActive: {
        color: '#B62022',
        fontWeight: '800',
    },
    // FAB (center action button)
    fabWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -22,
    },
    fab: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#B62022',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#B62022',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        marginBottom: 4,
    },
    fabLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#B62022',
    },
});

export default BottomTabBar;
