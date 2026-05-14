import React, { useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

const PulseIndicator = React.memo(() => {
    const scale = React.useRef(new Animated.Value(1)).current;
    const opacity = React.useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.parallel([
                Animated.timing(scale, { toValue: 2.2, duration: 1500, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [scale, opacity]);

    return (
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale }], opacity }]} />
    );
});

const styles = StyleSheet.create({
    pulseCircle: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(225, 29, 72, 0.4)',
    },
});

export default PulseIndicator;
