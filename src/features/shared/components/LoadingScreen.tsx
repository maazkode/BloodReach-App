import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, StatusBar, Animated, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface LoadingScreenProps {
    title?: string;
    tagline?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
    title = "Optimizing Experience", 
    tagline = "Fetching your data..." 
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        const heartbeat = Animated.parallel([
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 800,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0.4,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ]);

        Animated.loop(heartbeat).start();
    }, [pulseAnim, opacityAnim]);

    return (
        <LinearGradient 
            colors={['#FFFFFF', '#FFFFFF']} 
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.inner}>
                <View style={styles.loadingLogoBox}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Image 
                            source={require('../../../assets/logo.png')} 
                            style={styles.loadingLogo} 
                            resizeMode="contain" 
                        />
                    </Animated.View>
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={styles.loadingSyncText}>{title}</Text>
                    <Text style={styles.loadingTagline}>{tagline}</Text>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingLogoBox: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    loadingLogo: {
        width: 140,
        height: 140,
        zIndex: 2,
    },
    textContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    loadingSyncText: {
        fontSize: 20,
        color: '#1E293B',
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    loadingTagline: {
        marginTop: 8,
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
    },
});

export default LoadingScreen;
