import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';

const SplashScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>

                {/* Logo (same style as Auth Screen) */}
                <View style={styles.logoWrapper}>
                    <Image
                        source={require('../assets/logo.png')} // same path as auth
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* App Name */}
                <Text style={styles.title}>BloodReach</Text>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    content: {
        alignItems: 'center',
    },

    logoWrapper: {
        width: 110,
        height: 110,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        // Premium Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },

    logo: {
        width: 80,
        height: 80,
    },

    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: 1,
    },
});

export default SplashScreen;