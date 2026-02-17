import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Logo } from '../components/Logo';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';


const { height } = Dimensions.get('window');

const SplashScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    React.useEffect(() => {
        const timer = setTimeout(() => {
            navigation.replace('RoleSelection');
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigation]);

    return (

        <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <View style={styles.content}>
                <Logo size={120} />

                <View style={styles.textContainer}>
                    <Text style={styles.title}>BloodReach</Text>
                    <Text style={styles.subtitle}>
                        Connecting Lives Through{'\n'}Blood
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.version}>v1.0.2</Text>
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
    content: {
        alignItems: 'center',
        marginBottom: height * 0.1,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 30,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 20,
        color: Colors.white,
        textAlign: 'center',
        marginTop: 15,
        fontWeight: '500',
        lineHeight: 28,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
    },
    version: {
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 15,
        fontSize: 14,
        fontWeight: '400',
    },
});

export default SplashScreen;
